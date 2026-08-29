import { AsyncLocalStorage } from "node:async_hooks";

export type DatabaseRequestContext = {
	connectionString?: string;
	kysely?: { destroy(): Promise<void> };
	drizzle?: { pool?: { end(): Promise<void> } };
};

const storage = new AsyncLocalStorage<DatabaseRequestContext>();

export function getDatabaseRequestContext():
	| DatabaseRequestContext
	| undefined {
	return storage.getStore();
}

export async function runWithDatabaseRequestContext<T>(
	connectionString: string | undefined,
	fn: () => T | Promise<T>,
): Promise<T> {
	const context: DatabaseRequestContext = { connectionString };
	return storage.run(context, async () => {
		try {
			return await fn();
		} finally {
			if (context.kysely) await context.kysely.destroy();
			if (context.drizzle?.pool) await context.drizzle.pool.end();
		}
	});
}
