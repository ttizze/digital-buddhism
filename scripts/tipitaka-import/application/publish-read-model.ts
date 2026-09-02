import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
	ReadModelKey,
	TipitakaReadModelSnapshot,
} from "@/app/[locale]/_infrastructure/tipitaka-read-model/model";
import { publishAllTipitakaReadModels } from "@/app/[locale]/_infrastructure/tipitaka-read-model/publisher.server";
import type { TipitakaReadModelStore } from "@/app/[locale]/_infrastructure/tipitaka-read-model/store";

const BULK_TARGET_BYTES = 50 * 1024 * 1024;

type BulkEntry = {
	key: string;
	value: string;
};

class WranglerBulkStore implements TipitakaReadModelStore {
	private entries: BulkEntry[] = [];
	private bytes = 0;
	private batch = 0;

	constructor(
		private readonly directory: string,
		private readonly remote: boolean,
	) {}

	async get<Snapshot extends TipitakaReadModelSnapshot>(
		_key: ReadModelKey<Snapshot>,
	): Promise<Snapshot | null> {
		return null;
	}

	async put<Snapshot extends TipitakaReadModelSnapshot>(
		key: ReadModelKey<Snapshot>,
		value: Snapshot,
	): Promise<void> {
		const serialized = JSON.stringify(value);
		const bytes = Buffer.byteLength(key) + Buffer.byteLength(serialized);
		if (bytes > 25 * 1024 * 1024) {
			throw new Error(`Tipitaka read model exceeds KV value limit: ${key}`);
		}
		if (this.bytes + bytes > BULK_TARGET_BYTES && this.entries.length > 0) {
			await this.flush();
		}
		this.entries.push({ key, value: serialized });
		this.bytes += bytes;
	}

	async finish(): Promise<void> {
		if (this.entries.length > 0) await this.flush();
	}

	private async flush(): Promise<void> {
		const file = join(this.directory, `tipitaka-read-model-${this.batch}.json`);
		await writeFile(file, JSON.stringify(this.entries));
		const target = this.remote ? "--remote" : "--local";
		const child = spawn(
			"bunx",
			[
				"wrangler",
				"kv",
				"bulk",
				"put",
				file,
				"--binding",
				"TIPITAKA_READ_MODELS",
				target,
			],
			{
				cwd: process.cwd(),
				stdio: "inherit",
			},
		);
		const exitCode = await new Promise<number>((resolve, reject) => {
			child.once("error", reject);
			child.once("exit", (code) => resolve(code ?? 1));
		});
		if (exitCode !== 0) {
			throw new Error(`wrangler kv bulk put failed with exit code ${exitCode}`);
		}
		this.batch += 1;
		this.entries = [];
		this.bytes = 0;
	}
}

export async function publishTipitakaReadModelsWithWrangler(
	remote: boolean,
): Promise<void> {
	const directory = await mkdtemp(join(tmpdir(), "tipitaka-read-model-"));
	try {
		const store = new WranglerBulkStore(directory, remote);
		await publishAllTipitakaReadModels(store);
		await store.finish();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}
