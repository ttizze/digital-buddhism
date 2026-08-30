import { db } from "@/db";

const SEGMENT_TYPES = [
	{ key: "PRIMARY" as const, label: "Primary" },
	{ key: "COMMENTARY" as const, label: "Atthakatha" },
	{ key: "COMMENTARY" as const, label: "Tika" },
];

export async function ensureSegmentTypes() {
	for (const segmentType of SEGMENT_TYPES) {
		await db
			.insertInto("segmentTypes")
			.values(segmentType)
			.onConflict((conflict) => conflict.columns(["key", "label"]).doNothing())
			.execute();
	}
	return db.selectFrom("segmentTypes").select(["key", "id", "label"]).execute();
}
