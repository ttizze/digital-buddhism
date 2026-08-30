import type {
	TranslationJobForToast,
	TranslationJobStatus,
} from "@/app/types/translation-job";
import { db } from "@/db";

/** 指定されたIDの翻訳ジョブを取得する */
export async function fetchTranslationJobsByIds(
	ids: number[],
): Promise<TranslationJobForToast[]> {
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

	const rowsTyped: TranslationJobForToast[] = rows.map((row) => ({
		id: row.id,
		locale: row.locale,
		status: row.status as TranslationJobStatus,
		progress: row.progress,
		error: row.error,
		page: { slug: row.pageSlug },
	}));

	return rowsTyped;
}
