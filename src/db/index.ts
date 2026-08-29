import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { Pool as PgPool } from "pg";
import { getDatabaseRequestContext } from "./request-context";
import type { DB } from "./types";

type PoolType = NeonPool | PgPool;
export type KyselyDbWithPool = Kysely<DB> & { pool: PoolType };

declare global {
	var __kyselyDb: KyselyDbWithPool | null;
}

function createDb(connectionString?: string): KyselyDbWithPool {
	const resolvedConnectionString =
		connectionString ||
		process.env.DATABASE_URL ||
		(process.env.NODE_ENV === "test"
			? "postgres://postgres:postgres@db.localtest.me:5435/main"
			: "");
	if (!resolvedConnectionString) {
		throw new Error("DATABASE_URL is not defined");
	}

	const isHyperdrive = Boolean(connectionString);
	const isLocal =
		new URL(resolvedConnectionString).hostname === "db.localtest.me";
	let pool: PoolType;
	if (isLocal || isHyperdrive) {
		pool = new PgPool({
			connectionString: resolvedConnectionString,
			max: isHyperdrive ? 5 : 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 30000,
		});
	} else {
		// Vercel/Node環境では既存のNeon serverlessドライバを使用する。
		neonConfig.poolQueryViaFetch = true;
		pool = new NeonPool({ connectionString: resolvedConnectionString });
	}

	const db = new Kysely<DB>({
		dialect: new PostgresDialect({ pool }),
		plugins: [new CamelCasePlugin()],
	});

	return Object.assign(db, { pool });
}

function getCurrentDb(): KyselyDbWithPool {
	const requestContext = getDatabaseRequestContext();
	if (requestContext) {
		if (!requestContext.kysely) {
			requestContext.kysely = createDb(requestContext.connectionString);
		}
		return requestContext.kysely as KyselyDbWithPool;
	}

	if (!globalThis.__kyselyDb) {
		globalThis.__kyselyDb = createDb();
	}
	return globalThis.__kyselyDb;
}

export const db = new Proxy({} as KyselyDbWithPool, {
	get(_target, prop: string | symbol) {
		const currentDb = getCurrentDb();
		const value = currentDb[prop as keyof KyselyDbWithPool];
		if (typeof value === "function") return value.bind(currentDb);
		return value;
	},
});

export async function disposeDb(): Promise<void> {
	if (globalThis.__kyselyDb) {
		if (typeof globalThis.__kyselyDb.destroy === "function") {
			await globalThis.__kyselyDb.destroy();
		}
	}
	globalThis.__kyselyDb = null;
}
