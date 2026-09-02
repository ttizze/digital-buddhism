import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Client } from "@libsql/client";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vite-plus/test";
import { disposeDb } from "@/db";
import { openMigratedTursoDatabase } from "../../../turso-migrations";
import type { UpsertPageAndSegmentsInput } from "./index";

const databasePath = join(
	tmpdir(),
	`digital-buddhism-tipitaka-transaction-${randomUUID()}.db`,
);

let setupClient: Client;
let upsertPageAndSegments: (typeof import("./index"))["upsertPageAndSegments"];

describe("upsertPageAndSegments の libSQL トランザクション", () => {
	beforeAll(async () => {
		({ upsertPageAndSegments } = await import("./index"));
	});

	beforeEach(async () => {
		vi.stubEnv("TURSO_DATABASE_URL", `file:${databasePath}`);
		vi.stubEnv("TURSO_AUTH_TOKEN", "");
		await disposeDb();
		setupClient = await openMigratedTursoDatabase(`file:${databasePath}`);
	});

	afterEach(async () => {
		await disposeDb();
		setupClient.close();
		vi.unstubAllEnvs();
		await unlink(databasePath).catch(() => undefined);
	});

	const params = {
		catalogKey: "tipitaka-page",
		pageSlug: "tipitaka-page",
		mdastJson: { type: "root", children: [] },
		textLevel: null,
		parentId: null,
		position: 0,
		importFileId: null,
		segments: [],
	} satisfies UpsertPageAndSegmentsInput;

	it("Tipitakaページを作成し後続処理までcommitする", async () => {
		await setupClient.execute("INSERT INTO import_runs DEFAULT VALUES");
		await setupClient.execute(
			"INSERT INTO import_files (import_run_id, path, checksum) VALUES (1, 'test.md', 'checksum')",
		);
		const result = await upsertPageAndSegments({
			...params,
			importFileId: 1,
		});

		expect(result.slug).toBe("tipitaka-page");
		const pages = await setupClient.execute(
			"SELECT catalog_key, slug, text_level, import_file_id FROM tipitaka_pages",
		);
		expect(pages.rows).toEqual([
			{
				catalog_key: "tipitaka-page",
				slug: "tipitaka-page",
				text_level: null,
				import_file_id: 1,
			},
		]);
	});

	it("セグメント同期が失敗したらTipitakaページをrollbackする", async () => {
		await expect(
			upsertPageAndSegments({
				...params,
				segments: [
					{ number: 0, text: "A", textAndOccurrenceHash: "hash-a" },
					{ number: 0, text: "B", textAndOccurrenceHash: "hash-b" },
				],
			}),
		).rejects.toThrow();

		const pages = await setupClient.execute("SELECT id FROM tipitaka_pages");
		expect(pages.rows).toEqual([]);
	});
});
