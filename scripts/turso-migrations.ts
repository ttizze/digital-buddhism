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
		await migrate(drizzle(client), { migrationsFolder: migrationDirectory });
		await client.execute("PRAGMA foreign_keys = ON");
		const foreignKeys = await client.execute("PRAGMA foreign_keys");
		if (Number(foreignKeys.rows[0]?.foreign_keys) !== 1) {
			throw new Error("SQLite foreign key enforcement could not be enabled");
		}
		return client;
	} catch (error) {
		client.close();
		throw error;
	}
}
