import { AsyncLocalStorage } from "node:async_hooks";
import { type Client, createClient } from "@libsql/client";

export type DatabaseRequestContext = {
	url?: string;
	authToken?: string;
	client?: Pick<Client, "close">;
	kysely?: { destroy(): Promise<void> };
	drizzle?: { $client: Pick<Client, "close"> };
};

const storage = new AsyncLocalStorage<DatabaseRequestContext>();

declare global {
	var __tursoClient: Client | null;
}

export function getDatabaseRequestContext():
	| DatabaseRequestContext
	| undefined {
	return storage.getStore();
}

export function getDatabaseConnectionConfig(): {
	url: string;
	authToken?: string;
} {
	const context = getDatabaseRequestContext();
	const url = context ? context.url : process.env.TURSO_DATABASE_URL;
	if (!url) {
		throw new Error("TURSO_DATABASE_URL is not defined");
	}

	return {
		url,
		authToken: context ? context.authToken : process.env.TURSO_AUTH_TOKEN,
	};
}

export function getDatabaseClient(): Client {
	const context = getDatabaseRequestContext();
	if (context) {
		if (!context.client) {
			context.client = createClient(getDatabaseConnectionConfig());
		}
		return context.client as Client;
	}

	if (!globalThis.__tursoClient) {
		globalThis.__tursoClient = createClient(getDatabaseConnectionConfig());
	}
	return globalThis.__tursoClient;
}

export async function runWithDatabaseRequestContext<T>(
	connection: { url?: string; authToken?: string },
	fn: () => T | Promise<T>,
): Promise<T> {
	const context: DatabaseRequestContext = connection;
	return storage.run(context, async () => {
		try {
			return await fn();
		} finally {
			try {
				if (context.kysely) await context.kysely.destroy();
			} finally {
				(context.client ?? context.drizzle?.$client)?.close();
			}
		}
	});
}
