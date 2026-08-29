import { db } from "@/db";

/**
 * ページの翻訳ジョブを取得（各localeの最新COMPLETEDのみ）
 */
export async function fetchCompletedTranslationJobs(pageId: number) {
	const rankedQuery = db
		.selectFrom("translationJobs")
		.selectAll("translationJobs")
		.select((eb) =>
			eb.fn
				.agg<number>("row_number")
				.over((ob) =>
					ob
						.partitionBy("translationJobs.locale")
						.orderBy("translationJobs.createdAt", "desc"),
				)
				.as("rowNumber"),
		)
		.where("pageId", "=", pageId)
		.where("status", "=", "COMPLETED");

	const rows = await db
		.selectFrom(rankedQuery.as("ranked"))
		.selectAll("ranked")
		.where("ranked.rowNumber", "=", 1)
		.orderBy("ranked.locale")
		.execute();

	return rows.map(({ rowNumber: _, ...job }) => job);
}

/**
 * slugからページIDを取得
 */
export async function fetchPageIdBySlug(slug: string) {
	const result = await db
		.selectFrom("pages")
		.select("id")
		.where("slug", "=", slug)
		.executeTakeFirst();
	return result ?? null;
}

/**
 * ページの閲覧数を取得
 */
export async function fetchPageViewCount(pageId: number): Promise<number> {
	const result = await db
		.selectFrom("pageViews")
		.select("count")
		.where("pageId", "=", pageId)
		.executeTakeFirst();
	return result?.count ?? 0;
}
