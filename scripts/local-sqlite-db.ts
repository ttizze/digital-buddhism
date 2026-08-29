import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";

const migrationDirectory = join(import.meta.dirname, "../src/drizzle/turso");

async function applyTursoMigrations(databaseUrl: string): Promise<void> {
	const migrationFiles = (
		await readdir(migrationDirectory, {
			withFileTypes: true,
		})
	)
		.filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
		.map((entry) => entry.name)
		.sort();

	if (migrationFiles.length === 0) {
		throw new Error(
			`Turso migration files were not found: ${migrationDirectory}`,
		);
	}

	const client = createClient({ url: databaseUrl });
	try {
		for (const migrationFile of migrationFiles) {
			const migrationSql = await readFile(
				join(migrationDirectory, migrationFile),
				"utf8",
			);
			await client.executeMultiple(
				migrationSql.replaceAll("--> statement-breakpoint", "\n"),
			);
		}

		await client.execute("PRAGMA foreign_keys = ON");
		const foreignKeys = await client.execute("PRAGMA foreign_keys");
		if (Number(foreignKeys.rows[0]?.foreign_keys) !== 1) {
			throw new Error("SQLite foreign key enforcement could not be enabled");
		}
	} finally {
		client.close();
	}
}

/**
 * 本番・共有DBを使わない一時SQLite DBを作成する。
 * Turso用SQLを適用してから返すため、呼び出し側はそのままDBへ接続できる。
 */
export async function createLocalSqliteDatabase(
	prefix = "digital-buddshim-sqlite-",
) {
	const directory = await mkdtemp(join(tmpdir(), prefix));
	const path = join(directory, "database.sqlite");
	const url = pathToFileURL(path).toString();

	try {
		await applyTursoMigrations(url);
	} catch (error) {
		await rm(directory, { recursive: true, force: true });
		throw error;
	}

	let cleaned = false;
	return {
		path,
		url,
		cleanup: async () => {
			if (cleaned) {
				return;
			}
			cleaned = true;
			await rm(directory, { recursive: true, force: true });
		},
	};
}

export function buildLocalDatabaseEnv(
	baseEnv: NodeJS.ProcessEnv,
	databaseUrl: string,
): NodeJS.ProcessEnv {
	const { DATABASE_URL: _databaseUrl, ...envWithoutPostgresUrl } = baseEnv;
	return {
		...envWithoutPostgresUrl,
		TURSO_DATABASE_URL: databaseUrl,
		TURSO_AUTH_TOKEN: "",
	};
}
