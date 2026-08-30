import { db } from "@/db";

/**
 * 本文ページにリンクされた別ページの注釈ページIDを返す。
 */
export async function fetchAnnotationPageIdsForPage(
	pageId: number,
): Promise<number[]> {
	const result = await db
		.selectFrom("segmentAnnotationLinks")
		.innerJoin(
			"segments as mainSegment",
			"segmentAnnotationLinks.mainSegmentId",
			"mainSegment.id",
		)
		.innerJoin(
			"segments as annotationSegment",
			"segmentAnnotationLinks.annotationSegmentId",
			"annotationSegment.id",
		)
		.select("annotationSegment.tipitakaPageId as pageId")
		.distinct()
		.where("mainSegment.tipitakaPageId", "=", pageId)
		.where("annotationSegment.tipitakaPageId", "!=", pageId)
		.execute();

	return result.map((row) => row.pageId);
}
