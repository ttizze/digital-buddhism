import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";

/** 注釈ページ配下のリンクを全削除する。 */
export async function deleteAnnotationLinksByPageId(
	tx: TransactionClient,
	annotationPageId: number,
): Promise<void> {
	await tx
		.deleteFrom("segmentAnnotationLinks")
		.where(
			"annotationSegmentId",
			"in",
			tx
				.selectFrom("segments")
				.select("id")
				.where("contentId", "=", annotationPageId),
		)
		.execute();
}

/**
 * アノテーションリンクを作成する
 * Kysely版に移行済み
 */
export async function createAnnotationLinks(
	tx: TransactionClient,
	linksToCreate: Array<{
		mainSegmentId: number;
		annotationSegmentId: number;
	}>,
): Promise<void> {
	await tx
		.insertInto("segmentAnnotationLinks")
		.values(linksToCreate)
		.onConflict((oc) => oc.doNothing())
		.execute();
}
