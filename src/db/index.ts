import { LibsqlDialect } from "@libsql/kysely-libsql";
import { CamelCasePlugin, Kysely } from "kysely";
import {
	getDatabaseClient,
	getDatabaseRequestContext,
} from "./request-context";
import { TursoValueCodecPlugin } from "./turso-value-codec";
import type { DB } from "./types";

export type KyselyDbWithClient = Kysely<DB> & {
	client: ReturnType<typeof getDatabaseClient>;
};

declare global {
	var __kyselyDb: KyselyDbWithClient | null;
}

function createDb(): KyselyDbWithClient {
	const client = getDatabaseClient();
	const db = new Kysely<DB>({
		dialect: new LibsqlDialect({
			// 0.4.1の型定義だけが内包する古い@libsql/client型との境界。
			client:
				client as unknown as import("@libsql/kysely-libsql").libsql.Client,
		}),
		plugins: [new CamelCasePlugin(), new TursoValueCodecPlugin()],
	});

	return Object.assign(db, { client });
}

function getCurrentDb(): KyselyDbWithClient {
	const requestContext = getDatabaseRequestContext();
	if (requestContext) {
		if (!requestContext.kysely) {
			requestContext.kysely = createDb();
		}
		return requestContext.kysely as KyselyDbWithClient;
	}

	if (!globalThis.__kyselyDb) {
		globalThis.__kyselyDb = createDb();
	}
	return globalThis.__kyselyDb;
}

export const db = new Proxy({} as KyselyDbWithClient, {
	get(_target, prop: string | symbol) {
		const currentDb = getCurrentDb();
		const value = currentDb[prop as keyof KyselyDbWithClient];
		if (typeof value === "function") return value.bind(currentDb);
		return value;
	},
});

export async function disposeDb(): Promise<void> {
	try {
		if (globalThis.__kyselyDb) {
			if (typeof globalThis.__kyselyDb.destroy === "function") {
				await globalThis.__kyselyDb.destroy();
			}
		}
	} finally {
		if (globalThis.__tursoClient) {
			globalThis.__tursoClient.close();
		}
		globalThis.__tursoClient = null;
		globalThis.__kyselyDb = null;
		globalThis.__drizzleDb = null;
	}
}
