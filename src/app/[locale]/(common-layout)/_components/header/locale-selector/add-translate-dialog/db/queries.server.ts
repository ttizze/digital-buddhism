import { db } from "@/db";

/** Returns every official annotation page targeting the requested page. */
export async function fetchAnnotationPageIdsForPage(
	pageId: number,
): Promise<number[]> {
	const result = await db
		.selectFrom("tipitakaPageAnnotationTargets")
		.select("annotationPageId")
		.where("targetPageId", "=", pageId)
		.orderBy("position")
		.execute();
	return result.map((row) => row.annotationPageId);
}
