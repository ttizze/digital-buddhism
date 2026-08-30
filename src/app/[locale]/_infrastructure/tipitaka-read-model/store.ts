import { AsyncLocalStorage } from "node:async_hooks";

export type TipitakaReadModelStore = {
	get(key: string): Promise<string | null>;
	put(key: string, value: string): Promise<void>;
};

export type KvNamespaceBinding = {
	get(
		key: string,
		options?: { cacheTtl?: number; type?: "text" },
	): Promise<string | null>;
	put(key: string, value: string): Promise<void>;
};

const storage = new AsyncLocalStorage<TipitakaReadModelStore>();

export function createKvReadModelStore(
	binding: KvNamespaceBinding,
): TipitakaReadModelStore {
	return {
		get: (key) => binding.get(key, { cacheTtl: 60, type: "text" }),
		put: (key, value) => binding.put(key, value),
	};
}

export function getTipitakaReadModelStore(): TipitakaReadModelStore {
	const store = storage.getStore();
	if (!store) throw new Error("TIPITAKA_READ_MODELS binding is not configured");
	return store;
}

export async function runWithTipitakaReadModelStore<T>(
	store: TipitakaReadModelStore,
	fn: () => T | Promise<T>,
): Promise<T> {
	return storage.run(store, fn);
}
