import { neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { WebSocket } from "ws";
import { getDatabaseRequestContext } from "@/db/request-context";
import * as schema from "./schema";

type DrizzleDb =
	| ReturnType<typeof drizzleNeon<typeof schema>>
	| ReturnType<typeof drizzlePg<typeof schema>>;

export type DrizzleDbWithPool = DrizzleDb & { pool?: Pool };

declare global {
	var __drizzleDb: DrizzleDbWithPool | null;
}

export function makeDb(
	connectionString = process.env.DATABASE_URL || "",
): DrizzleDbWithPool {
	if (!connectionString) {
		throw new Error("DATABASE_URL is not defined");
	}

	const isLocal = new URL(connectionString).hostname === "db.localtest.me";
	if (isLocal) {
		// ローカル環境ではpgクライアントを使用
		const pool = new Pool({ connectionString });
		const db = drizzlePg(pool, { schema });
		return Object.assign(db, { pool });
	}

	// Neon serverless 環境（Vercel/Nodeのfallback）
	neonConfig.poolQueryViaFetch = true;
	neonConfig.webSocketConstructor = WebSocket;
	return drizzleNeon(connectionString, { schema });
}

function getCurrentDb(): DrizzleDbWithPool {
	const requestContext = getDatabaseRequestContext();
	if (requestContext) {
		if (!requestContext.drizzle) {
			const connectionString = requestContext.connectionString;
			if (connectionString) {
				const pool = new Pool({
					connectionString,
					max: 5,
					idleTimeoutMillis: 30000,
					connectionTimeoutMillis: 30000,
				});
				requestContext.drizzle = Object.assign(drizzlePg(pool, { schema }), {
					pool,
				});
			} else {
				requestContext.drizzle = makeDb();
			}
		}
		return requestContext.drizzle as DrizzleDbWithPool;
	}

	if (!globalThis.__drizzleDb) globalThis.__drizzleDb = makeDb();
	return globalThis.__drizzleDb;
}

// Proxyでラップすることで、テスト時にDATABASE_URLを切り替えても新しい接続が使われる
export const db = new Proxy({} as DrizzleDbWithPool, {
	get(_target, prop: string | symbol) {
		const currentDb = getCurrentDb();
		const value = currentDb[prop as keyof DrizzleDbWithPool];
		if (typeof value === "function") return value.bind(currentDb);
		return value;
	},
});
