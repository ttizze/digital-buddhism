import { AsyncLocalStorage } from "node:async_hooks";
import { type Client, createClient } from "@libsql/client";

type DatabaseRequestContext = {
	url?: string;
	authToken?: string;
	client?: Client;
	kysely?: { destroy(): Promise<void> };
};

interface DatabaseConnectionConfig {
	url: string;
	authToken?: string;
}

interface DatabaseConnection {
	url?: string;
	authToken?: string;
}

const storage = new AsyncLocalStorage<DatabaseRequestContext>();

declare global {
	var __tursoClient: Client | null;
}

export function getDatabaseRequestContext():
	| DatabaseRequestContext
	| undefined {
	return storage.getStore();
}

export function getDatabaseConnectionConfig(): DatabaseConnectionConfig {
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
		return context.client;
	}

	if (!globalThis.__tursoClient) {
		globalThis.__tursoClient = createClient(getDatabaseConnectionConfig());
	}
	return globalThis.__tursoClient;
}

export function runWithDatabaseRequestContext(
	connection: DatabaseConnection,
	fn: () => Response | Promise<Response>,
): Promise<Response>;
export function runWithDatabaseRequestContext<T>(
	connection: DatabaseConnection,
	fn: () => T | Promise<T>,
): Promise<T>;
export async function runWithDatabaseRequestContext<T>(
	connection: DatabaseConnection,
	fn: () => T | Promise<T>,
): Promise<T | Response> {
	const context: DatabaseRequestContext = connection;
	return storage.run(context, async () => {
		let cleanupPromise: Promise<void> | undefined;
		const cleanup = () => {
			cleanupPromise ??= (async () => {
				try {
					if (context.kysely) await context.kysely.destroy();
				} finally {
					context.client?.close();
				}
			})();
			return cleanupPromise;
		};

		try {
			const result = await fn();

			if (result instanceof Response && result.body) {
				const { readable, writable } = new TransformStream<
					Uint8Array,
					Uint8Array
				>();
				const piping = result.body.pipeTo(writable);
				const cleanupAfterStream = () => {
					void cleanup().catch(() => undefined);
				};
				void piping.then(cleanupAfterStream, cleanupAfterStream);

				return new Response(readable, {
					headers: result.headers,
					status: result.status,
					statusText: result.statusText,
				});
			}

			await cleanup();
			return result;
		} catch (error) {
			await cleanup();
			throw error;
		}
	});
}
