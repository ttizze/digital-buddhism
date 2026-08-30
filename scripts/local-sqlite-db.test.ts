import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createClient } from "@libsql/client";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { describe, expect, it } from "vitest";
import {
	buildLocalDatabaseEnv,
	createLocalSqliteDatabase,
} from "./local-sqlite-db";

const execFileAsync = promisify(execFile);

const expectedMigrations = readMigrationFiles({
	migrationsFolder: join(import.meta.dirname, "../src/drizzle/turso"),
});
const latestExpectedMigration = expectedMigrations.at(-1);
if (!latestExpectedMigration) throw new Error("No Turso migrations found");

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
			expect(migrations.rows).toHaveLength(expectedMigrations.length);
			expect(String(migrations.rows.at(-1)?.hash)).toBe(
				latestExpectedMigration.hash,
			);
			expect(Number(migrations.rows.at(-1)?.created_at)).toBe(
				latestExpectedMigration.folderMillis,
			);
		} finally {
			client.close();
			await database.cleanup();
		}
	});

	it("Tipitakaを正規化schemaへ移し翻訳選定と参照整合性を保持する", async () => {
		const directory = await mkdtemp(
			join(tmpdir(), "digital-buddshim-tipitaka-cutover-"),
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
					"INSERT INTO users (id, handle, email) VALUES ('legacy-system-user', 'evame', 'evame@example.com')",
					"INSERT INTO users (id, handle, email) VALUES ('translator', 'translator', 'translator@example.com')",
					"INSERT INTO contents (id, kind) VALUES (100, 'PAGE'), (101, 'PAGE'), (200, 'PAGE')",
					"INSERT INTO pages (id, slug, user_id, mdast_json, status, parent_id, \"order\") VALUES (100, 'tipitaka', 'legacy-system-user', '{}', 'PUBLIC', NULL, 0)",
					"INSERT INTO pages (id, slug, user_id, mdast_json, status, parent_id, \"order\") VALUES (101, 'vinaya-pitaka', 'legacy-system-user', '{}', 'PUBLIC', 100, 1)",
					"INSERT INTO pages (id, slug, user_id, mdast_json, status, parent_id, \"order\") VALUES (200, 'about', 'translator', '{}', 'PUBLIC', NULL, 0)",
					"INSERT INTO segment_types (id, label, key) VALUES (100, 'Primary', 'PRIMARY')",
					"INSERT INTO segments (id, content_id, number, text, text_and_occurrence_hash, segment_type_id) VALUES (100, 100, 0, 'Tipitaka', 'tipitaka-title', 100)",
					"INSERT INTO segments (id, content_id, number, text, text_and_occurrence_hash, segment_type_id) VALUES (101, 101, 0, 'Vinaya', 'vinaya-title', 100)",
					"INSERT INTO segments (id, content_id, number, text, text_and_occurrence_hash, segment_type_id) VALUES (200, 200, 0, 'About', 'about-title', 100)",
					"INSERT INTO segment_translations (id, segment_id, locale, text, point, user_id) VALUES (101, 101, 'ja', '採用訳', 1, 'translator')",
					"INSERT INTO segment_translations (id, segment_id, locale, text, point, user_id) VALUES (102, 101, 'ja', '高得点訳', 100, 'translator')",
					"INSERT INTO segment_translations (id, segment_id, locale, text, point, user_id) VALUES (200, 200, 'ja', 'About訳', 1, 'translator')",
					"INSERT INTO translation_votes (translation_id, user_id, is_upvote) VALUES (101, 'legacy-system-user', 1)",
					"INSERT INTO notifications (id, user_id, type, actor_id, segment_translation_id) VALUES (101, 'translator', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'legacy-system-user', 101)",
					"INSERT INTO notifications (id, user_id, type, actor_id, segment_translation_id) VALUES (200, 'translator', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'legacy-system-user', 200)",
					"INSERT INTO translation_jobs (id, page_id, user_id, locale, ai_model) VALUES (101, 101, 'translator', 'ja', 'test-model')",
					"INSERT INTO translation_jobs (id, page_id, user_id, locale, ai_model) VALUES (200, 200, 'translator', 'ja', 'test-model')",
					"INSERT INTO page_locale_translation_proofs (id, page_id, locale) VALUES (101, 101, 'ja')",
					"INSERT INTO page_locale_translation_proofs (id, page_id, locale) VALUES (200, 200, 'ja')",
					"INSERT INTO personal_access_tokens (id, key_hash, user_id) VALUES (1, 'obsolete-token', 'translator')",
					"INSERT INTO translation_contexts (id, user_id, name, context) VALUES (1, 'translator', 'obsolete', 'unused')",
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
					tipitaka_pages.id AS page_id,
					tipitaka_pages.catalog_key,
					tipitaka_pages.text_level,
					segments.tipitaka_page_id AS segment_page_id,
					segments.source_paragraph_number,
					segment_translations.id AS translation_id,
					notifications.id AS notification_id
				FROM tipitaka_pages
				JOIN segments ON segments.tipitaka_page_id = tipitaka_pages.id
				JOIN segment_translations ON segment_translations.segment_id = segments.id
				JOIN notifications
					ON notifications.segment_translation_id = segment_translations.id
				WHERE tipitaka_pages.id = 101
			`);
			expect(preserved.rows).toEqual([
				expect.objectContaining({
					catalog_key: "vinaya-pitaka",
					text_level: "MULA",
					notification_id: 101,
					page_id: 101,
					segment_page_id: 101,
					source_paragraph_number: null,
					translation_id: 101,
				}),
			]);

			const selection = await client.execute(
				"SELECT segment_id, locale, translation_id, selected_by_user_id FROM selected_segment_translations",
			);
			expect(selection.rows).toEqual([
				{
					locale: "ja",
					segment_id: 101,
					selected_by_user_id: "legacy-system-user",
					translation_id: 101,
				},
			]);

			const systemUser = await client.execute(
				"SELECT handle, name, image FROM users WHERE id = 'legacy-system-user'",
			);
			expect(systemUser.rows).toEqual([
				{
					handle: "tipitaka",
					image: "/favicon.svg",
					name: "Tipiṭaka",
				},
			]);

			for (const table of [
				"tipitaka_pages",
				"segments",
				"segment_translations",
				"notifications",
				"translation_jobs",
				"page_locale_translation_proofs",
			]) {
				const result = await client.execute(
					`SELECT count(*) AS count FROM ${table} WHERE id = 200`,
				);
				expect(Number(result.rows[0]?.count)).toBe(0);
			}

			const segmentForeignKeys = await client.execute(
				"PRAGMA foreign_key_list(segments)",
			);
			expect(
				segmentForeignKeys.rows.some((row) => row.table === "tipitaka_pages"),
			).toBe(true);
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
						'pages',
						'personal_access_tokens',
						'tag_pages',
						'tags',
						'translation_contexts',
						'segment_types'
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
			expect(first.rows).toHaveLength(expectedMigrations.length);
			expect(String(first.rows.at(-1)?.hash)).toBe(
				latestExpectedMigration.hash,
			);
			expect(Number(first.rows.at(-1)?.created_at)).toBe(
				latestExpectedMigration.folderMillis,
			);

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
