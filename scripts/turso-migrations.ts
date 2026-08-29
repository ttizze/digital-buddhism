import { join } from "node:path";
import { type Client, createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const migrationDirectory = join(import.meta.dirname, "../src/drizzle/turso");

/** Drizzle Kitと同じlibSQL migratorでschemaとmigration journalを同期した接続を返す。 */
export async function openMigratedTursoDatabase(
	databaseUrl: string,
): Promise<Client> {
	const client = createClient({ url: databaseUrl });
	try {
		// Drizzle's SQLite table rebuilds run inside a transaction, where its
		// migration-level PRAGMA statements cannot change foreign key enforcement.
		await client.execute("PRAGMA foreign_keys = OFF");
		await migrate(drizzle(client), { migrationsFolder: migrationDirectory });
		await client.execute("PRAGMA foreign_keys = ON");

		const foreignKeys = await client.execute("PRAGMA foreign_keys");
		if (Number(foreignKeys.rows[0]?.foreign_keys) !== 1) {
			throw new Error("SQLite foreign key enforcement could not be enabled");
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
	const client = await openMigratedTursoDatabase(databaseUrl);
	client.close();
}
