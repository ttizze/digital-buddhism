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
		.select("annotationSegment.contentId as pageId")
		.distinct()
		.where("mainSegment.contentId", "=", pageId)
		.where("annotationSegment.contentId", "!=", pageId)
		.execute();

	return result.map((row) => row.pageId);
}
