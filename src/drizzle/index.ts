import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import {
	getDatabaseClient,
	getDatabaseRequestContext,
} from "@/db/request-context";
import * as schema from "./schema";

export type DrizzleDbWithClient = LibSQLDatabase<typeof schema> & {
	$client: ReturnType<typeof getDatabaseClient>;
};

declare global {
	var __drizzleDb: DrizzleDbWithClient | null;
}

export function makeDb(): DrizzleDbWithClient {
	return drizzleLibsql(getDatabaseClient(), { schema });
}

function getCurrentDb(): DrizzleDbWithClient {
	const requestContext = getDatabaseRequestContext();
	if (requestContext) {
		if (!requestContext.drizzle) {
			requestContext.drizzle = makeDb();
		}
		return requestContext.drizzle as DrizzleDbWithClient;
	}

	if (!globalThis.__drizzleDb) {
		globalThis.__drizzleDb = makeDb();
	}
	return globalThis.__drizzleDb;
}

export const db = new Proxy({} as DrizzleDbWithClient, {
	get(_target, prop: string | symbol) {
		const currentDb = getCurrentDb();
		const value = currentDb[prop as keyof DrizzleDbWithClient];
		if (typeof value === "function") return value.bind(currentDb);
		return value;
	},
});
