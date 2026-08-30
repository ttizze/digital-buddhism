import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Client, createClient } from "@libsql/client";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { disposeDb } from "@/db";
import type { JsonValue } from "@/drizzle/types";

const databasePath = join(
	tmpdir(),
	`evame-tipitaka-transaction-${randomUUID()}.db`,
);

let setupClient: Client;
let upsertPageAndSegments: typeof import("./index")["upsertPageAndSegments"];

async function createImportTables() {
	await setupClient.execute(`
		CREATE TABLE tipitaka_pages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			parent_id INTEGER,
			slug TEXT NOT NULL UNIQUE,
			kind TEXT NOT NULL,
			position INTEGER NOT NULL,
			mdast_json TEXT NOT NULL,
			is_visible INTEGER NOT NULL
		)
	`);
	await setupClient.execute(`
		CREATE TABLE segment_types (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			key TEXT NOT NULL,
			label TEXT NOT NULL
		)
	`);
	await setupClient.execute(
		"INSERT INTO segment_types (id, key, label) VALUES (1, 'PRIMARY', 'Primary')",
	);
	await setupClient.execute(`
		CREATE TABLE segments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tipitaka_page_id INTEGER NOT NULL,
			number INTEGER NOT NULL,
			text TEXT NOT NULL,
			text_and_occurrence_hash TEXT NOT NULL,
			segment_type_id INTEGER NOT NULL,
			UNIQUE (tipitaka_page_id, number),
			UNIQUE (tipitaka_page_id, text_and_occurrence_hash)
		)
	`);
	await setupClient.execute(`
		CREATE TABLE segment_metadata_types (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			key TEXT NOT NULL
		)
	`);
	await setupClient.execute(`
		CREATE TABLE segment_metadata (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			segment_id INTEGER NOT NULL,
			metadata_type_id INTEGER NOT NULL,
			value TEXT NOT NULL
		)
	`);
	await setupClient.execute(`
		CREATE TABLE segment_annotation_links (
			main_segment_id INTEGER NOT NULL,
			annotation_segment_id INTEGER NOT NULL
		)
	`);
}

describe("upsertPageAndSegments の libSQL トランザクション", () => {
	beforeAll(async () => {
		({ upsertPageAndSegments } = await import("./index"));
	});

	beforeEach(async () => {
		vi.stubEnv("TURSO_DATABASE_URL", `file:${databasePath}`);
		vi.stubEnv("TURSO_AUTH_TOKEN", "");
		await disposeDb();
		setupClient = createClient({ url: `file:${databasePath}` });
		await setupClient.execute("DROP TABLE IF EXISTS segment_annotation_links");
		await setupClient.execute("DROP TABLE IF EXISTS segment_metadata");
		await setupClient.execute("DROP TABLE IF EXISTS segment_metadata_types");
		await setupClient.execute("DROP TABLE IF EXISTS segments");
		await setupClient.execute("DROP TABLE IF EXISTS segment_types");
		await setupClient.execute("DROP TABLE IF EXISTS tipitaka_pages");
		await createImportTables();
	});

	afterEach(async () => {
		await disposeDb();
		setupClient.close();
		vi.unstubAllEnvs();
		await unlink(databasePath).catch(() => undefined);
	});

	const params = {
		pageSlug: "tipitaka-page",
		mdastJson: JSON.stringify({ type: "root", children: [] }) as JsonValue,
		kind: "TEXT" as const,
		parentId: null,
		position: 0,
		isVisible: true,
		segments: [],
		segmentTypeId: null,
		anchorPageId: null,
	};

	it("Tipitakaページを作成し後続処理までcommitする", async () => {
		const result = await upsertPageAndSegments(params);

		expect(result.slug).toBe("tipitaka-page");
		const pages = await setupClient.execute(
			"SELECT slug, kind, is_visible FROM tipitaka_pages",
		);
		expect(pages.rows).toEqual([
			{ slug: "tipitaka-page", kind: "TEXT", is_visible: 1 },
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
