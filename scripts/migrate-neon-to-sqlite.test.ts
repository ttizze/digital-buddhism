import { createClient } from "@libsql/client";
import { describe, expect, it } from "vitest";
import { createLocalSqliteDatabase } from "./local-sqlite-db";
import {
	APP_TABLE_NAMES,
	buildTableMetadata,
	getNeonConnectionString,
	migrateNeonToSqlite,
	normalizeSourceValue,
	validateTableNames,
} from "./migrate-neon-to-sqlite";

describe("NeonからSQLiteへ移送する値の変換", () => {
	it("Dateをepoch millisecondへ変換する", () => {
		expect(
			normalizeSourceValue(
				{ dataType: "timestamp without time zone", udtName: "timestamp" },
				new Date("2026-08-29T00:00:00.123Z"),
			),
		).toBe(1787961600123);
	});

	it("booleanをSQLiteの0または1へ変換する", () => {
		const column = { dataType: "boolean", udtName: "bool" };
		expect(normalizeSourceValue(column, true)).toBe(1);
		expect(normalizeSourceValue(column, false)).toBe(0);
		expect(normalizeSourceValue(column, null)).toBeNull();
	});

	it("JSONとPostgres配列を安定したJSON文字列へ変換する", () => {
		expect(
			normalizeSourceValue(
				{ dataType: "jsonb", udtName: "jsonb" },
				{
					z: 1,
					a: { d: true, b: 2 },
				},
			),
		).toBe('{"a":{"b":2,"d":true},"z":1}');
		expect(
			normalizeSourceValue({ dataType: "ARRAY", udtName: "_text" }, [
				"ja",
				"en",
			]),
		).toBe('["ja","en"]');
		expect(
			normalizeSourceValue({ dataType: "ARRAY", udtName: "_text" }, "{ja,en}"),
		).toBe('["ja","en"]');
		expect(
			normalizeSourceValue(
				{ dataType: "ARRAY", udtName: "_text" },
				'{"NULL",NULL,"a,b"}',
			),
		).toBe('["NULL",null,"a,b"]');
	});

	it("nullはそのまま保持する", () => {
		expect(
			normalizeSourceValue({ dataType: "integer", udtName: "int4" }, null),
		).toBeNull();
	});

	it("不正な日時は変換時に失敗する", () => {
		expect(() =>
			normalizeSourceValue(
				{ dataType: "timestamp without time zone", udtName: "timestamp" },
				"not-a-date",
			),
		).toThrow("Invalid timestamp");
	});
});

describe("NeonからSQLiteへ移送するテーブル計画", () => {
	it("アプリケーションの28テーブルを一度ずつ含む", () => {
		expect(APP_TABLE_NAMES).toHaveLength(28);
		expect(new Set(APP_TABLE_NAMES).size).toBe(28);
	});

	it("重複や未知のテーブルを計画へ入れない", () => {
		expect(validateTableNames(APP_TABLE_NAMES)).toEqual(APP_TABLE_NAMES);
		expect(() => validateTableNames(["users", "users"])).toThrow(
			"Duplicate table",
		);
	});

	it("sourceとtargetの列が不足・余剰なく完全一致することを要求する", () => {
		const sourceColumns = new Map([
			[
				"users",
				new Map([
					["id", { dataType: "text", udtName: "text" }],
					["source_only", { dataType: "text", udtName: "text" }],
				]),
			],
		]);

		expect(() =>
			buildTableMetadata(
				[
					{
						name: "users",
						columns: ["id", "target_only"],
						autoIncrement: false,
					},
				],
				sourceColumns,
			),
		).toThrow(
			"Column mismatch for users: missing in source [target_only]; extra in source [source_only]",
		);
	});
});

describe("Neon接続先の選択", () => {
	it("UNPOOLEDを優先し、なければDATABASE_URLを使う", () => {
		expect(
			getNeonConnectionString({
				DATABASE_URL_UNPOOLED: "postgres://unpooled",
				DATABASE_URL: "postgres://pooled",
			}),
		).toBe("postgres://unpooled");
		expect(getNeonConnectionString({ DATABASE_URL: "postgres://pooled" })).toBe(
			"postgres://pooled",
		);
	});

	it("接続先がなければ接続情報を含めず失敗する", () => {
		expect(() => getNeonConnectionString({})).toThrow(
			"DATABASE_URL_UNPOOLED or DATABASE_URL is required",
		);
	});
});

describe("NeonからSQLiteへの小規模移送リハーサル", () => {
	it("単一のread only repeatable read snapshotで全28テーブルを一度だけSELECTし、FK・JSON・boolean・sequenceを検証する", async () => {
		const fixture = await createLocalSqliteDatabase(
			"digital-buddshim-etl-fixture-",
		);
		const fixtureClient = createClient({ url: fixture.url });
		const queries: string[] = [];
		const date = new Date("2026-08-29T00:00:00.123Z");
		const rows: Record<string, Record<string, unknown>[]> = {
			users: [
				{
					image: "https://example.test/avatar.png",
					plan: "free",
					total_points: 0,
					is_ai: false,
					provider: "Credentials",
					created_at: date,
					updated_at: date,
					name: "Fixture",
					handle: "fixture",
					profile: "",
					id: "user-1",
					email: "fixture@example.test",
					twitter_handle: "",
					email_verified: null,
				},
			],
			import_runs: [
				{ id: 10, started_at: date, finished_at: null, status: "COMPLETED" },
			],
			import_files: [
				{
					id: 11,
					import_run_id: 10,
					path: "fixture.md",
					checksum: "checksum",
					status: "IMPORTED",
					message: "",
					created_at: date,
				},
			],
			contents: [
				{
					id: 100,
					kind: "PAGE",
					created_at: date,
					updated_at: date,
					import_file_id: 11,
				},
				{
					id: 101,
					kind: "PAGE_COMMENT",
					created_at: date,
					updated_at: date,
					import_file_id: null,
				},
				{
					id: 102,
					kind: "PAGE",
					created_at: date,
					updated_at: date,
					import_file_id: 11,
				},
				{
					id: 103,
					kind: "PAGE_COMMENT",
					created_at: date,
					updated_at: date,
					import_file_id: null,
				},
			],
			pages: [
				{
					id: 100,
					slug: "root",
					created_at: date,
					source_locale: "pli",
					updated_at: date,
					status: "PUBLIC",
					user_id: "user-1",
					mdast_json: { z: 1, a: true },
					order: 0,
					parent_id: null,
					published_at: date,
					archived_at: null,
				},
				{
					id: 102,
					slug: "child",
					created_at: date,
					source_locale: "pli",
					updated_at: date,
					status: "ARCHIVE",
					user_id: "user-1",
					mdast_json: { type: "root", children: [] },
					order: 1,
					parent_id: 100,
					published_at: null,
					archived_at: date,
				},
			],
			page_comments: [
				{
					id: 101,
					page_id: 100,
					created_at: date,
					updated_at: date,
					locale: "en",
					user_id: "user-1",
					parent_id: null,
					mdast_json: { type: "doc", content: [] },
					is_deleted: false,
					last_reply_at: null,
					reply_count: 1,
				},
				{
					id: 103,
					page_id: 100,
					created_at: date,
					updated_at: date,
					locale: "en",
					user_id: "user-1",
					parent_id: 101,
					mdast_json: { type: "doc", content: [{ type: "paragraph" }] },
					is_deleted: true,
					last_reply_at: date,
					reply_count: 0,
				},
			],
			segment_types: [{ id: 200, label: "Primary", key: "PRIMARY" }],
			segments: [
				{
					id: 300,
					content_id: 100,
					number: 1,
					text: "text",
					text_and_occurrence_hash: "hash",
					created_at: date,
					segment_type_id: 200,
				},
			],
			segment_translations: [
				{
					id: 400,
					segment_id: 300,
					locale: "ja",
					text: "訳",
					point: 1,
					created_at: date,
					user_id: "user-1",
				},
			],
			tags: [{ id: 500, name: "fixture" }],
			tag_pages: [{ tag_id: 500, page_id: 100 }],
			user_settings: [
				{
					id: 700,
					user_id: "user-1",
					target_locales: ["ja", "en"],
					created_at: date,
					updated_at: date,
				},
			],
			notifications: [
				{
					id: 600,
					user_id: "user-1",
					type: "PAGE_LIKE",
					read: true,
					created_at: date,
					actor_id: "user-1",
					page_comment_id: 101,
					page_id: 100,
					segment_translation_id: 400,
				},
			],
		};
		const enumValues: Record<string, string[]> = {
			content_kind: ["PAGE", "PAGE_COMMENT"],
			notification_type: [
				"FOLLOW",
				"PAGE_COMMENT",
				"PAGE_LIKE",
				"PAGE_SEGMENT_TRANSLATION_VOTE",
				"PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE",
			],
			page_status: ["DRAFT", "PUBLIC", "ARCHIVE"],
			segment_type_key: ["PRIMARY", "COMMENTARY"],
			translation_proof_status: [
				"MACHINE_DRAFT",
				"HUMAN_TOUCHED",
				"PROOFREAD",
				"VALIDATED",
			],
			translation_status: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
		};
		const source = {
			query: async (queryText: string) => {
				queries.push(queryText);
				if (
					queryText === "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" ||
					queryText === "COMMIT" ||
					queryText === "ROLLBACK"
				) {
					return { rows: [] };
				}
				if (queryText.includes("information_schema.columns")) {
					const metadata: Record<string, unknown>[] = [];
					for (const tableName of APP_TABLE_NAMES) {
						const tableInfo = await fixtureClient.execute(
							`PRAGMA table_info("${tableName}")`,
						);
						for (const row of tableInfo.rows) {
							const columnName = String((row as Record<string, unknown>).name);
							const enumType =
								tableName === "contents" && columnName === "kind"
									? "content_kind"
									: tableName === "notifications" && columnName === "type"
										? "notification_type"
										: tableName === "pages" && columnName === "status"
											? "page_status"
											: tableName === "segment_types" && columnName === "key"
												? "segment_type_key"
												: tableName === "page_locale_translation_proofs" &&
														columnName === "translation_proof_status"
													? "translation_proof_status"
													: tableName === "translation_jobs" &&
															columnName === "status"
														? "translation_status"
														: null;
							const isDate =
								columnName.endsWith("_at") ||
								columnName === "created_at" ||
								columnName === "updated_at";
							const isBoolean = [
								"is_ai",
								"email_verified",
								"is_deleted",
								"read",
								"is_upvote",
							].includes(columnName);
							metadata.push({
								table_name: tableName,
								column_name: columnName,
								data_type: enumType
									? "USER-DEFINED"
									: tableName === "user_settings" &&
											columnName === "target_locales"
										? "ARRAY"
										: tableName === "pages" && columnName === "mdast_json"
											? "jsonb"
											: tableName === "page_comments" &&
													columnName === "mdast_json"
												? "jsonb"
												: isDate
													? "timestamp without time zone"
													: isBoolean
														? "boolean"
														: "text",
								udt_name:
									enumType ??
									(tableName === "user_settings" &&
									columnName === "target_locales"
										? "_text"
										: isBoolean
											? "bool"
											: "text"),
								ordinal_position:
									Number((row as Record<string, unknown>).cid) + 1,
							});
						}
					}
					return { rows: metadata };
				}
				if (queryText.includes("FROM pg_type")) {
					return {
						rows: Object.entries(enumValues).flatMap(([type_name, values]) =>
							values.map((value) => ({ type_name, value })),
						),
					};
				}
				const tableName = queryText.match(/FROM "([a-z_]+)"/)?.[1];
				if (!tableName) throw new Error("fixture query was not a table SELECT");
				return { rows: rows[tableName] ?? [] };
			},
		};

		try {
			const summary = await migrateNeonToSqlite({ source });
			expect(summary.status).toBe("success");
			expect(Object.keys(summary.tables)).toHaveLength(28);
			expect(summary.tables.users).toEqual({ sourceRows: 1, targetRows: 1 });
			expect(summary.validation.integrityCheck).toBe("ok");
			expect(summary.validation.foreignKeyErrors).toEqual([]);
			expect(summary.validation.jsonErrors).toEqual([]);
			expect(summary.validation.enumErrors).toEqual([]);
			expect(summary.validation.booleanErrors).toEqual([]);
			expect(summary.validation.sequenceErrors).toEqual([]);
			expect(queries[0]).toBe(
				"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
			);
			expect(queries.at(-1)).toBe("COMMIT");
			expect(queries).not.toContain("ROLLBACK");
			const readQueries = queries.filter((query) =>
				/^\s*SELECT\b/i.test(query),
			);
			expect(readQueries).toHaveLength(30);
			expect(
				readQueries.filter((query) =>
					/^SELECT .+ FROM "[a-z_]+"$/i.test(query),
				),
			).toHaveLength(28);
			const resultClient = createClient({
				url: `file:${summary.generatedDatabasePath}`,
			});
			try {
				const journalMode = await resultClient.execute("PRAGMA journal_mode");
				expect(String(journalMode.rows[0]?.journal_mode).toLowerCase()).toBe(
					"wal",
				);
				const page = await resultClient.execute(
					"SELECT created_at, mdast_json FROM pages WHERE id = 100",
				);
				expect(page.rows[0]?.created_at).toBe(date.getTime());
				expect(page.rows[0]?.mdast_json).toBe('{"a":true,"z":1}');
				const userSettings = await resultClient.execute(
					"SELECT target_locales FROM user_settings WHERE id = 700",
				);
				expect(userSettings.rows[0]?.target_locales).toBe('["ja","en"]');
				const sequence = await resultClient.execute(
					"SELECT seq FROM sqlite_sequence WHERE name = 'contents'",
				);
				expect(Number(sequence.rows[0]?.seq)).toBe(103);
			} finally {
				resultClient.close();
			}
		} finally {
			fixtureClient.close();
			await fixture.cleanup();
		}
	});

	it("snapshot内の読取に失敗したらrollbackし、sourceを必ず解放する", async () => {
		const queries: string[] = [];
		const lifecycle: string[] = [];
		const source = {
			query: async (queryText: string) => {
				queries.push(queryText);
				if (queryText.includes("information_schema.columns")) {
					throw new Error("metadata read failed");
				}
				return { rows: [] };
			},
			release: () => {
				lifecycle.push("release");
			},
			end: async () => {
				lifecycle.push("end");
			},
		};

		await expect(migrateNeonToSqlite({ source })).rejects.toThrow(
			"metadata read failed",
		);
		expect(queries[0]).toBe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
		expect(queries.at(-1)).toBe("ROLLBACK");
		expect(queries).not.toContain("COMMIT");
		expect(lifecycle).toEqual(["release", "end"]);
	});
});
