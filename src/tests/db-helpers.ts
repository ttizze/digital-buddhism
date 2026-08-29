import { sql } from "kysely";
import { db } from "@/db";
import type { SegmentTypeKey } from "@/db/types";

const preservedTables = new Set([
	"segment_types",
	"segment_metadata_types",
	"tags",
	"drizzle_migrations",
	"__drizzle_migrations",
]);

/**
 * データベースをリセット（全テーブルをクリーンアップ）
 * 外部キー制約の順序に注意して削除
 */
export async function resetDatabase() {
	await db.client.execute("PRAGMA foreign_keys = OFF");
	try {
		const tables = await sql<{ name: string }>`
			SELECT name
			FROM sqlite_master
			WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
		`.execute(db);

		for (const table of tables.rows) {
			if (!preservedTables.has(table.name)) {
				await sql`DELETE FROM ${sql.id(table.name)}`.execute(db);
			}
		}
	} finally {
		await db.client.execute("PRAGMA foreign_keys = ON");
	}

	const foreignKeys = await db.client.execute("PRAGMA foreign_keys");
	if (Number(foreignKeys.rows[0]?.foreign_keys) !== 1) {
		throw new Error("SQLite foreign key enforcement is disabled");
	}
}

/**
 * マスターデータをセットアップ（SegmentType、SegmentMetadataTypeなど）
 * グローバルに1回だけ実行される想定
 */
export async function setupMasterData() {
	// SegmentTypeを取得または作成（既に存在する場合は更新しない）
	const primaryType = await db
		.selectFrom("segmentTypes")
		.selectAll()
		.where("key", "=", "PRIMARY")
		.executeTakeFirst();

	let primarySegmentTypeId: number;
	if (!primaryType) {
		const inserted = await db
			.insertInto("segmentTypes")
			.values({ key: "PRIMARY", label: "Primary" })
			.returning(["id"])
			.executeTakeFirstOrThrow();
		primarySegmentTypeId = inserted.id;
	} else {
		primarySegmentTypeId = primaryType.id;
	}

	const commentaryType = await db
		.selectFrom("segmentTypes")
		.selectAll()
		.where("key", "=", "COMMENTARY")
		.executeTakeFirst();

	let commentarySegmentTypeId: number;
	if (!commentaryType) {
		const inserted = await db
			.insertInto("segmentTypes")
			.values({ key: "COMMENTARY", label: "Commentary" })
			.returning(["id"])
			.executeTakeFirstOrThrow();
		commentarySegmentTypeId = inserted.id;
	} else {
		commentarySegmentTypeId = commentaryType.id;
	}

	// SegmentMetadataTypeを取得または作成
	const metadataTypeSeedData = [
		{ key: "VRI_PAGEBREAK", label: "VRI Page Break" },
		{ key: "PTS_PAGEBREAK", label: "PTS Page Break" },
		{ key: "THAI_PAGEBREAK", label: "Thai Page Break" },
		{ key: "MYANMAR_PAGEBREAK", label: "Myanmar Page Break" },
		{ key: "OTHER_PAGEBREAK", label: "Other Page Break" },
		{ key: "PARAGRAPH_NUMBER", label: "Paragraph Number" },
	];

	// skipDuplicates相当の処理: 既存のkeyを確認してから挿入
	for (const data of metadataTypeSeedData) {
		const existing = await db
			.selectFrom("segmentMetadataTypes")
			.selectAll()
			.where("key", "=", data.key)
			.executeTakeFirst();
		if (!existing) {
			await db.insertInto("segmentMetadataTypes").values(data).execute();
		}
	}

	return {
		primarySegmentTypeId,
		commentarySegmentTypeId,
	};
}

/**
 * SegmentTypeのIDを取得（マスターデータから）
 */
export async function getSegmentTypeId(key: SegmentTypeKey): Promise<number> {
	const segmentType = await db
		.selectFrom("segmentTypes")
		.selectAll()
		.where("key", "=", key)
		.executeTakeFirst();
	if (!segmentType) {
		throw new Error(
			`SegmentType with key "${key}" not found. Make sure setupMasterData() is called.`,
		);
	}
	return segmentType.id;
}
