import { createClient } from "@libsql/client";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { createLocalSqliteDatabase } from "./local-sqlite-db";
import { resetLocalDatabase } from "./reset-local-db";

const databases: Array<Awaited<ReturnType<typeof createLocalSqliteDatabase>>> =
	[];

afterEach(async () => {
	for (const database of databases.splice(0)) {
		await database.cleanup();
	}
});

describe("ローカルSQLiteのリセット", () => {
	it("DBファイルを再作成してmigration済みの空状態へ戻す", async () => {
		const database = await createLocalSqliteDatabase(
			"digital-buddshim-reset-test-",
		);
		databases.push(database);
		let client = createClient({ url: database.url });
		await client.execute("INSERT INTO import_runs DEFAULT VALUES");
		client.close();

		await resetLocalDatabase(database.url);

		client = createClient({ url: database.url });
		try {
			const rows = await client.execute(
				"SELECT count(*) AS count FROM import_runs",
			);
			const migrations = await client.execute(
				"SELECT count(*) AS count FROM __drizzle_migrations",
			);
			expect(Number(rows.rows[0]?.count)).toBe(0);
			expect(Number(migrations.rows[0]?.count)).toBeGreaterThan(0);
		} finally {
			client.close();
		}
	});

	it("共有DB URLを拒否する", async () => {
		await expect(
			resetLocalDatabase("libsql://production.example"),
		).rejects.toThrow("TURSO_DATABASE_URL must target a local database");
	});
});
