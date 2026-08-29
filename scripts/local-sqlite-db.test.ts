import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createClient } from "@libsql/client";
import { describe, expect, it } from "vitest";
import {
	buildLocalDatabaseEnv,
	createLocalSqliteDatabase,
} from "./local-sqlite-db";

const execFileAsync = promisify(execFile);

describe("ローカルSQLiteのDrizzle migration", () => {
	it("fixture作成時に正式なmigration journalを記録する", async () => {
		const database = await createLocalSqliteDatabase(
			"digital-buddshim-migration-journal-",
		);
		const client = createClient({ url: database.url });
		try {
			const migrations = await client.execute(
				"SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at",
			);
			expect(migrations.rows).toHaveLength(1);
			expect(String(migrations.rows[0]?.hash)).toMatch(/^[0-9a-f]{64}$/);
			expect(Number(migrations.rows[0]?.created_at)).toBe(1787994304423);
		} finally {
			client.close();
			await database.cleanup();
		}
	});

	it("db:prod:migrate相当を初回と2回目に実行すると2回目はno-opになる", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "digital-buddshim-migration-command-"),
		);
		const databaseUrl = pathToFileURL(
			join(directory, "database.sqlite"),
		).toString();
		const env = buildLocalDatabaseEnv(process.env, databaseUrl);
		const client = createClient({ url: databaseUrl });
		try {
			await execFileAsync("bun", ["run", "db:prod:migrate"], {
				cwd: join(import.meta.dirname, ".."),
				env,
			});
			const first = await client.execute(
				"SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at",
			);
			expect(first.rows).toHaveLength(1);
			expect(String(first.rows[0]?.hash)).toMatch(/^[0-9a-f]{64}$/);
			expect(Number(first.rows[0]?.created_at)).toBe(1787994304423);

			await execFileAsync("bun", ["run", "db:prod:migrate"], {
				cwd: join(import.meta.dirname, ".."),
				env,
			});
			const second = await client.execute(
				"SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at",
			);
			expect(second.rows).toEqual(first.rows);
		} finally {
			client.close();
			await rm(directory, { recursive: true, force: true });
		}
	});
});
