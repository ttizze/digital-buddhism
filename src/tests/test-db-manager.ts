import { createHash } from "node:crypto";
import { afterAll } from "vite-plus/test";
import { db, disposeDb } from "@/db";
import {
	buildLocalDatabaseEnv,
	createLocalSqliteDatabase,
} from "../../scripts/local-sqlite-db";
import { setupMasterData } from "./db-helpers";

const testDatabaseEnvKeys = [
	"DATABASE_URL",
	"TURSO_DATABASE_URL",
	"TURSO_AUTH_TOKEN",
] as const;

function restoreTestDatabaseEnv(
	previousEnv: ReadonlyMap<string, string | undefined>,
): void {
	for (const key of testDatabaseEnvKeys) {
		const value = previousEnv.get(key);
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}

/** DB接続を破棄する（テスト間の接続切り替え用） */
export async function resetAllClients(): Promise<void> {
	await disposeDb();
}

/** テストファイルごとに独立したSQLite DBを作成し、schemaとマスターデータを投入する */
export async function setupDbPerFile(fileUrl: string): Promise<void> {
	const fileId = createHash("sha256")
		.update(fileUrl)
		.digest("hex")
		.slice(0, 10);
	const database = await createLocalSqliteDatabase(
		`digital-buddshim-vitest-${fileId}-`,
	);
	const previousEnv = new Map(
		testDatabaseEnvKeys.map((key) => [key, process.env[key]]),
	);
	delete process.env.DATABASE_URL;
	Object.assign(process.env, buildLocalDatabaseEnv(process.env, database.url));

	try {
		await resetAllClients();
		await db.client.execute("PRAGMA foreign_keys = ON");
		await setupMasterData();

		const foreignKeys = await db.client.execute("PRAGMA foreign_keys");
		if (Number(foreignKeys.rows[0]?.foreign_keys) !== 1) {
			throw new Error("SQLite foreign key enforcement is disabled for tests");
		}
	} catch (error) {
		try {
			await resetAllClients();
		} finally {
			await database.cleanup();
			restoreTestDatabaseEnv(previousEnv);
		}
		throw error;
	}

	afterAll(async () => {
		try {
			await resetAllClients();
		} finally {
			await database.cleanup();
			restoreTestDatabaseEnv(previousEnv);
		}
	});
}
