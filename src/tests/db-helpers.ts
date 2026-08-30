import { db } from "@/db";

const preservedTables: Record<string, true> = {
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
		.insertInto("segmentMetadataTypes")
		.values([
			{ key: "VRI_PAGEBREAK", label: "VRI Page Break" },
			{ key: "PTS_PAGEBREAK", label: "PTS Page Break" },
			{ key: "THAI_PAGEBREAK", label: "Thai Page Break" },
			{ key: "MYANMAR_PAGEBREAK", label: "Myanmar Page Break" },
			{ key: "OTHER_PAGEBREAK", label: "Other Page Break" },
		])
		.onConflict((oc) => oc.column("key").doNothing())
		.execute();
}
