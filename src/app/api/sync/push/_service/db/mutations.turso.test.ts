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
	`evame-sync-transaction-${randomUUID()}.db`,
);

let setupClient: Client;
let upsertPageForSync: typeof import("./mutations")["upsertPageForSync"];

async function createSyncTables() {
	await setupClient.execute(`
		CREATE TABLE pages (
			id INTEGER PRIMARY KEY,
			slug TEXT NOT NULL,
			user_id TEXT NOT NULL,
			mdast_json TEXT NOT NULL,
			source_locale TEXT NOT NULL,
			status TEXT NOT NULL,
			published_at INTEGER
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
}

describe("upsertPageForSync の libSQL トランザクション", () => {
	beforeAll(async () => {
		({ upsertPageForSync } = await import("./mutations"));
	});

	beforeEach(async () => {
		vi.stubEnv("TURSO_DATABASE_URL", `file:${databasePath}`);
		vi.stubEnv("TURSO_AUTH_TOKEN", "");
		await disposeDb();
		setupClient = createClient({ url: `file:${databasePath}` });
		await setupClient.execute("DROP TABLE IF EXISTS segments");
		await setupClient.execute("DROP TABLE IF EXISTS segment_types");
		await setupClient.execute("DROP TABLE IF EXISTS pages");
		await createSyncTables();
		await setupClient.execute(
			"INSERT INTO segment_types (id, key) VALUES (1, 'PRIMARY')",
		);
		await setupClient.execute({
			sql: `
				INSERT INTO pages
					(id, slug, user_id, mdast_json, source_locale, status, published_at)
				VALUES (1, 'existing', 'user-1', ?, 'ja', 'DRAFT', NULL)
			`,
			args: [JSON.stringify({ type: "root", children: [] })],
		});
	});

	afterEach(async () => {
		await disposeDb();
		setupClient.close();
		vi.unstubAllEnvs();
		await unlink(databasePath).catch(() => undefined);
	});

	it("ページ更新とセグメント同期をcommitする", async () => {
		const result = await upsertPageForSync({
			userId: "user-1",
			slug: "existing",
			existingPageId: 1,
			mdastJson: JSON.stringify({ type: "root", children: [] }) as JsonValue,
			segments: [],
			publishedAt: null,
			status: "PUBLIC",
		});

		expect(result).toEqual({ created: false });
		const row = await setupClient.execute(
			"SELECT status FROM pages WHERE id = 1",
		);
		expect(row.rows).toEqual([{ status: "PUBLIC" }]);
	});

	it("セグメント同期が失敗したらページ更新もrollbackする", async () => {
		await setupClient.execute("DELETE FROM segment_types");

		await expect(
			upsertPageForSync({
				userId: "user-1",
				slug: "existing",
				existingPageId: 1,
				mdastJson: JSON.stringify({ type: "root", children: [] }) as JsonValue,
				segments: [],
				publishedAt: null,
				status: "PUBLIC",
			}),
		).rejects.toThrow("Primary segment type not found");

		const row = await setupClient.execute(
			"SELECT status FROM pages WHERE id = 1",
		);
		expect(row.rows).toEqual([{ status: "DRAFT" }]);
	});
});
