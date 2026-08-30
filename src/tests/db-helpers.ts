import { db } from "@/db";
import type { SegmentTypeKey } from "@/drizzle/types";

const preservedTables: Record<string, true> = {
	segment_types: true,
	segment_metadata_types: true,
	drizzle_migrations: true,
	__drizzle_migrations: true,
};

export async function resetDatabase() {
	await db.client.execute("PRAGMA foreign_keys = OFF");
	try {
		const tables = await db.client.execute(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
		);
		for (const row of tables.rows) {
			const tableName = String(row.name);
			if (!preservedTables[tableName]) {
				if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
					throw new Error(`Unsafe SQLite table name: ${tableName}`);
				}
				await db.client.execute(`DELETE FROM "${tableName}"`);
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

export async function setupMasterData() {
	await db
		.insertInto("segmentTypes")
		.values([
			{ key: "PRIMARY", label: "Primary" },
			{ key: "COMMENTARY", label: "Commentary" },
		])
		.onConflict((oc) => oc.columns(["key", "label"]).doNothing())
		.execute();

	await db
		.insertInto("segmentMetadataTypes")
		.values([
			{ key: "VRI_PAGEBREAK", label: "VRI Page Break" },
			{ key: "PTS_PAGEBREAK", label: "PTS Page Break" },
			{ key: "THAI_PAGEBREAK", label: "Thai Page Break" },
			{ key: "MYANMAR_PAGEBREAK", label: "Myanmar Page Break" },
			{ key: "OTHER_PAGEBREAK", label: "Other Page Break" },
			{ key: "PARAGRAPH_NUMBER", label: "Paragraph Number" },
		])
		.onConflict((oc) => oc.column("key").doNothing())
		.execute();
}

export async function getSegmentTypeId(key: SegmentTypeKey): Promise<number> {
	const segmentType = await db
		.selectFrom("segmentTypes")
		.select("id")
		.where("key", "=", key)
		.executeTakeFirst();
	if (!segmentType) {
		throw new Error(
			`SegmentType with key "${key}" not found. Make sure setupMasterData() is called.`,
		);
	}
	return segmentType.id;
}
