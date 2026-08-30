import { join } from "node:path";
import { type Client, createClient, type InStatement } from "@libsql/client";
import { readMigrationFiles } from "drizzle-orm/migrator";

const migrationDirectory = join(import.meta.dirname, "../src/drizzle/turso");

/**
 * Drizzleのmigration journalを使い、各migrationを独立したTurso migrationとして
 * 適用する。大規模DBでも再実行時は最後に完了したmigrationから再開できる。
 */
export async function openMigratedTursoDatabase(
	databaseUrl: string,
	authToken?: string,
): Promise<Client> {
	const client = createClient({ url: databaseUrl, authToken });
	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS __drizzle_migrations (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			)
		`);
		const applied = await client.execute(
			"SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1",
		);
		const lastAppliedAt = Number(applied.rows[0]?.created_at ?? 0);
		const migrations = readMigrationFiles({
			migrationsFolder: migrationDirectory,
		});

		for (const migration of migrations) {
			if (migration.folderMillis <= lastAppliedAt) continue;

			const statements: InStatement[] = migration.sql.map((sql) => ({
				sql,
				args: [],
			}));
			statements.push({
				sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
				args: [migration.hash, migration.folderMillis],
			});
			await client.migrate(statements);
		}

		const violations = await client.execute("PRAGMA foreign_key_check");
		if (violations.rows.length > 0) {
			throw new Error(
				`SQLite migration left ${violations.rows.length} foreign key violation(s)`,
			);
		}

		return client;
	} catch (error) {
		client.close();
		throw error;
	}
}

if (import.meta.main) {
	const databaseUrl = process.env.TURSO_DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("TURSO_DATABASE_URL is not defined");
	}
	const client = await openMigratedTursoDatabase(
		databaseUrl,
		process.env.TURSO_AUTH_TOKEN,
	);
	client.close();
}
