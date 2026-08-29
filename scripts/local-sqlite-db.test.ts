import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createClient } from "@libsql/client";
import { describe, expect, it } from "vitest";
import {
	buildLocalDatabaseEnv,
	createLocalSqliteDatabase,
} from "./local-sqlite-db";

const execFileAsync = promisify(execFile);

describe("ローカルSQLiteのDrizzle migration", () => {
	it("fixture作成時に正式なmigration journalを記録する", async () => {
		const database = await createLocalSqliteDatabase(
			"digital-buddshim-migration-journal-",
		);
		const client = createClient({ url: database.url });
		try {
			const migrations = await client.execute(
				"SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at",
			);
			expect(migrations.rows).toHaveLength(5);
			expect(String(migrations.rows[0]?.hash)).toMatch(/^[0-9a-f]{64}$/);
			expect(Number(migrations.rows[4]?.created_at)).toBe(1788018212905);
		} finally {
			client.close();
			await database.cleanup();
		}
	});

	it("既存ページとセグメントを保持してcontents依存を外す", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "digital-buddshim-content-cutover-"),
		);
		const databaseUrl = pathToFileURL(
			join(directory, "database.sqlite"),
		).toString();
		const env = buildLocalDatabaseEnv(process.env, databaseUrl);
		let client = createClient({ url: databaseUrl });
		try {
			const baselineSql = await readFile(
				join(
					import.meta.dirname,
					"../src/drizzle/turso/0000_turso_baseline.sql",
				),
				"utf8",
			);
			await client.executeMultiple(
				baselineSql.replaceAll("--> statement-breakpoint", ""),
			);
			await client.execute(`
				CREATE TABLE __drizzle_migrations (
					id SERIAL PRIMARY KEY,
					hash text NOT NULL,
					created_at numeric
				)
			`);
			await client.execute({
				sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
				args: ["baseline", 1787994304423],
			});
			await client.batch(
				[
					"INSERT INTO users (id, handle, email) VALUES ('migration-user', 'migration-user', 'migration@example.com')",
					"INSERT INTO contents (id, kind) VALUES (100, 'PAGE')",
					"INSERT INTO pages (id, slug, user_id, mdast_json) VALUES (100, 'migration-page', 'migration-user', '{}')",
					"INSERT INTO segment_types (id, label, key) VALUES (100, 'Title', 'PRIMARY')",
					"INSERT INTO segments (id, content_id, number, text, text_and_occurrence_hash, segment_type_id) VALUES (100, 100, 0, 'Title', 'migration-title', 100)",
					"INSERT INTO segment_translations (id, segment_id, locale, text, user_id) VALUES (100, 100, 'en', 'Translated title', 'migration-user')",
					"INSERT INTO notifications (id, user_id, type, actor_id, segment_translation_id) VALUES (100, 'migration-user', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'migration-user', 100)",
				],
				"write",
			);
			client.close();

			await execFileAsync("bun", ["run", "db:prod:migrate"], {
				cwd: join(import.meta.dirname, ".."),
				env,
			});

			client = createClient({ url: databaseUrl });
			const preserved = await client.execute(`
				SELECT
					pages.id AS page_id,
					segments.content_id AS segment_page_id,
					segment_translations.id AS translation_id,
					notifications.id AS notification_id
				FROM pages
				JOIN segments ON segments.content_id = pages.id
				JOIN segment_translations ON segment_translations.segment_id = segments.id
				JOIN notifications
					ON notifications.segment_translation_id = segment_translations.id
			`);
			expect(preserved.rows).toEqual([
				expect.objectContaining({
					notification_id: 100,
					page_id: 100,
					segment_page_id: 100,
					translation_id: 100,
				}),
			]);

			const segmentForeignKeys = await client.execute(
				"PRAGMA foreign_key_list(segments)",
			);
			expect(segmentForeignKeys.rows.some((row) => row.table === "pages")).toBe(
				true,
			);
			expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
				[],
			);

			const removedTables = await client.execute(`
				SELECT name
				FROM sqlite_master
				WHERE type = 'table'
					AND name IN (
						'contents',
						'follows',
						'like_pages',
						'page_comments',
						'page_views',
						'tag_pages',
						'tags'
					)
			`);
			expect(removedTables.rows).toEqual([]);
		} finally {
			client.close();
			await rm(directory, { recursive: true, force: true });
		}
	});

	it("db:prod:migrate相当を初回と2回目に実行すると2回目はno-opになる", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "digital-buddshim-migration-command-"),
		);
		const databaseUrl = pathToFileURL(
			join(directory, "database.sqlite"),
		).toString();
		const env = buildLocalDatabaseEnv(process.env, databaseUrl);
		const client = createClient({ url: databaseUrl });
		try {
			await execFileAsync("bun", ["run", "db:prod:migrate"], {
				cwd: join(import.meta.dirname, ".."),
				env,
			});
			const first = await client.execute(
				"SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at",
			);
			expect(first.rows).toHaveLength(5);
			expect(String(first.rows[0]?.hash)).toMatch(/^[0-9a-f]{64}$/);
			expect(Number(first.rows[4]?.created_at)).toBe(1788018212905);

			await execFileAsync("bun", ["run", "db:prod:migrate"], {
				cwd: join(import.meta.dirname, ".."),
				env,
			});
			const second = await client.execute(
				"SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at",
			);
			expect(second.rows).toEqual(first.rows);
		} finally {
			client.close();
			await rm(directory, { recursive: true, force: true });
		}
	});
});
