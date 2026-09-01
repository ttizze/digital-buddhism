import { db } from "@/db";

/** 指定ユーザーが所有する翻訳ジョブだけを取得する。 */
export async function fetchTranslationJobsByIds(ids: number[], userId: string) {
	const rows = await db
		.selectFrom("translationJobs")
		.innerJoin("tipitakaPages", "translationJobs.pageId", "tipitakaPages.id")
		.select([
			"translationJobs.id",
			"translationJobs.locale",
			"translationJobs.status",
			"translationJobs.progress",
			"translationJobs.error",
			"tipitakaPages.slug as pageSlug",
		])
		.where("translationJobs.id", "in", ids)
		.where("translationJobs.userId", "=", userId)
		.execute();

	return rows.map(({ pageSlug, ...job }) => ({
		...job,
		page: { slug: pageSlug },
	}));
}
