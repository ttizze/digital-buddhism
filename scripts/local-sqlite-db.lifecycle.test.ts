import { existsSync } from "node:fs";
import { createClient } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";
import {
	buildLocalDatabaseEnv,
	createLocalSqliteDatabase,
} from "./local-sqlite-db";

const databases: Array<Awaited<ReturnType<typeof createLocalSqliteDatabase>>> =
	[];

afterEach(async () => {
	for (const database of databases.splice(0)) {
		await database.cleanup();
	}
});

describe("ローカルSQLiteテストDB", () => {
	it("baselineを適用した一時DBを並列利用でき、cleanupで削除できる", async () => {
		const first = await createLocalSqliteDatabase("digital-buddshim-test-");
		const second = await createLocalSqliteDatabase("digital-buddshim-test-");
		databases.push(first, second);

		expect(first.path).not.toBe(second.path);

		const client = createClient({ url: first.url });
		try {
			const tables = await client.execute(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
			);
			const foreignKeys = await client.execute("PRAGMA foreign_keys");

			expect(tables.rows.length).toBeGreaterThan(0);
			expect(Number(foreignKeys.rows[0]?.foreign_keys)).toBe(1);
		} finally {
			client.close();
		}

		expect(existsSync(first.path)).toBe(true);
		await first.cleanup();
		expect(existsSync(first.path)).toBe(false);
	});

	it("子プロセス用のDB環境変数は外部DBを参照しない", () => {
		const env = buildLocalDatabaseEnv(
			{
				DATABASE_URL: "postgres://external.invalid/main",
				TURSO_AUTH_TOKEN: "secret",
			},
			"file:///tmp/digital-buddshim-test.sqlite",
		);

		expect(env.TURSO_DATABASE_URL).toBe(
			"file:///tmp/digital-buddshim-test.sqlite",
		);
		expect(env.TURSO_AUTH_TOKEN).toBe("local");
		expect(env.DATABASE_URL).toBeUndefined();
	});
});
