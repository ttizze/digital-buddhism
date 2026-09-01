import { db } from "@/db";

/** 指定されたIDの翻訳ジョブを取得する。型の保証はハンドラ側の zod parse が担う */
export async function fetchTranslationJobsByIds(ids: number[]) {
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
		.execute();

	return rows.map(({ pageSlug, ...job }) => ({
		...job,
		page: { slug: pageSlug },
	}));
}
