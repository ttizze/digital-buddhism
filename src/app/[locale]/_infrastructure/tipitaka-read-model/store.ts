import { AsyncLocalStorage } from "node:async_hooks";
import * as v from "valibot";
import {
	type ReadModelKey,
	TIPITAKA_READ_MODEL_SCHEMA_VERSION,
	type TipitakaReadModelSnapshot,
} from "./model";

export type TipitakaReadModelStore = {
	get<Snapshot extends TipitakaReadModelSnapshot>(
		key: ReadModelKey<Snapshot>,
	): Promise<Snapshot | null>;
	put<Snapshot extends TipitakaReadModelSnapshot>(
		key: ReadModelKey<Snapshot>,
		value: Snapshot,
	): Promise<void>;
};

export type KvNamespaceBinding = {
	get(
		key: string,
		options?: { cacheTtl?: number; type?: "text" },
	): Promise<string | null>;
	put(key: string, value: string): Promise<void>;
};

const storage = new AsyncLocalStorage<TipitakaReadModelStore>();
const snapshotEnvelopeSchema = v.object({ schemaVersion: v.number() });

function parseStoredSnapshot<Snapshot extends TipitakaReadModelSnapshot>(
	value: string,
	key: ReadModelKey<Snapshot>,
): Snapshot {
	const parsed: unknown = JSON.parse(value);
	const envelope = v.parse(snapshotEnvelopeSchema, parsed);
	if (envelope.schemaVersion !== TIPITAKA_READ_MODEL_SCHEMA_VERSION) {
		throw new Error(`Unsupported Tipitaka read model schema at ${key}`);
	}
	// SAFETY: Typed keys can only be written through `put`, which requires the matching snapshot type; the persisted envelope version was validated above.
	return parsed as Snapshot;
}

export function createKvReadModelStore(
	binding: KvNamespaceBinding,
): TipitakaReadModelStore {
	const get: TipitakaReadModelStore["get"] = async (key) => {
		const value = await binding.get(key, { cacheTtl: 60, type: "text" });
		return value === null ? null : parseStoredSnapshot(value, key);
	};
	const put: TipitakaReadModelStore["put"] = (key, value) =>
		binding.put(key, JSON.stringify(value));

	return {
		get,
		put,
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
