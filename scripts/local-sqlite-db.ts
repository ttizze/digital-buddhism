import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { openMigratedTursoDatabase } from "./turso-migrations";

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
		const client = await openMigratedTursoDatabase(url);
		client.close();
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
		TURSO_AUTH_TOKEN: "local",
	};
}
