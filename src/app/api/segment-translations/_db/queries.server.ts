import { db } from "@/db";

export async function findPageBySegmentId(segmentId: number) {
	return (
		(await db
			.selectFrom("segments")
			.innerJoin("tipitakaPages", "segments.tipitakaPageId", "tipitakaPages.id")
			.select(["tipitakaPages.id", "tipitakaPages.slug"])
			.where("segments.id", "=", segmentId)
			.executeTakeFirst()) ?? null
	);
}
