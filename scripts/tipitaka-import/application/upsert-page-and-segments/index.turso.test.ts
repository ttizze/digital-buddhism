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
import type { JsonValue } from "@/db/types";

const databasePath = join(
	tmpdir(),
	`evame-tipitaka-transaction-${randomUUID()}.db`,
);

let setupClient: Client;
let upsertPageAndSegments: typeof import("./index")["upsertPageAndSegments"];

async function createImportTables() {
	await setupClient.execute(`
		CREATE TABLE contents (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			kind TEXT NOT NULL
		)
	`);
	await setupClient.execute(`
		CREATE TABLE pages (
			id INTEGER PRIMARY KEY,
			slug TEXT NOT NULL,
			user_id TEXT NOT NULL,
			mdast_json TEXT NOT NULL,
			source_locale TEXT NOT NULL,
			status TEXT NOT NULL,
			parent_id INTEGER,
			"order" INTEGER NOT NULL
		)
	`);
	await setupClient.execute(`
		CREATE TABLE segment_types (
			id INTEGER PRIMARY KEY,
			key TEXT NOT NULL
		)
	`);
	await setupClient.execute(`
		CREATE TABLE segments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			content_id INTEGER NOT NULL,
			number INTEGER NOT NULL,
			text TEXT NOT NULL,
			text_and_occurrence_hash TEXT NOT NULL,
			segment_type_id INTEGER NOT NULL
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
		await setupClient.execute("DROP TABLE IF EXISTS pages");
		await setupClient.execute("DROP TABLE IF EXISTS contents");
		await createImportTables();
		await setupClient.execute(
			"INSERT INTO segment_types (id, key) VALUES (1, 'PRIMARY')",
		);
	});

	afterEach(async () => {
		await disposeDb();
		setupClient.close();
		vi.unstubAllEnvs();
		await unlink(databasePath).catch(() => undefined);
	});

	const params = {
		pageSlug: "tipitaka-page",
		userId: "user-1",
		mdastJson: JSON.stringify({ type: "root", children: [] }) as JsonValue,
		sourceLocale: "ja",
		segments: [],
		segmentTypeId: null,
		parentId: null,
		order: 0,
		anchorContentId: null,
		status: "DRAFT" as const,
	};

	it("contentsとpagesを作成し後続処理までcommitする", async () => {
		const result = await upsertPageAndSegments(params);

		expect(result.slug).toBe("tipitaka-page");
		const contents = await setupClient.execute("SELECT id, kind FROM contents");
		const pages = await setupClient.execute("SELECT slug, status FROM pages");
		expect(contents.rows).toEqual([{ id: 1, kind: "PAGE" }]);
		expect(pages.rows).toEqual([{ slug: "tipitaka-page", status: "DRAFT" }]);
	});

	it("segments同期の開始前に失敗したらcontentsとpagesをrollbackする", async () => {
		await setupClient.execute("DELETE FROM segment_types");

		await expect(upsertPageAndSegments(params)).rejects.toThrow(
			"Primary segment type not found",
		);

		const contents = await setupClient.execute("SELECT id FROM contents");
		const pages = await setupClient.execute("SELECT id FROM pages");
		expect(contents.rows).toEqual([]);
		expect(pages.rows).toEqual([]);
	});
});
