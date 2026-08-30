import { db } from "@/db";

export async function findPageIdBySegmentTranslationId(
	segmentTranslationId: number,
): Promise<number> {
	const result = await db
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segmentTranslations.segmentId", "segments.id")
		.innerJoin("tipitakaPages", "segments.tipitakaPageId", "tipitakaPages.id")
		.select("tipitakaPages.id as pageId")
		.where("segmentTranslations.id", "=", segmentTranslationId)
		.executeTakeFirst();
	if (!result) throw new Error("Page not found");
	return result.pageId;
}
