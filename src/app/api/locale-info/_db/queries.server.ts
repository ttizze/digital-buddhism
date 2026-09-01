import { TIPITAKA_SOURCE_LOCALE } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { db } from "@/db";

/**
 * pageSlugからTipitakaページの翻訳ロケール情報を取得する。
 */
export async function fetchLocaleInfoByPageSlug(pageSlug: string) {
	// 1回のクエリで全て取得（LEFT JOIN を使用）
	const rows = await db
		.selectFrom("tipitakaPages")
		.leftJoin("translationJobs", (join) =>
			join
				.onRef("translationJobs.pageId", "=", "tipitakaPages.id")
				.on("translationJobs.status", "=", "COMPLETED"),
		)
		.leftJoin(
			"pageLocaleTranslationProofs",
			"pageLocaleTranslationProofs.pageId",
			"tipitakaPages.id",
		)
		.select([
			"tipitakaPages.id as pageId",
			"translationJobs.id as translationJobId",
			"translationJobs.pageId as translationJobPageId",
			"translationJobs.userId as translationJobUserId",
			"translationJobs.locale as translationJobLocale",
			"translationJobs.aiModel as translationJobAiModel",
			"translationJobs.status as translationJobStatus",
			"translationJobs.progress as translationJobProgress",
			"translationJobs.error as translationJobError",
			"translationJobs.createdAt as translationJobCreatedAt",
			"translationJobs.updatedAt as translationJobUpdatedAt",
			"pageLocaleTranslationProofs.locale as proofLocale",
			"pageLocaleTranslationProofs.translationProofStatus",
		])
		.where("tipitakaPages.slug", "=", pageSlug)
		.execute();

	if (rows.length === 0) {
		return null;
	}

	// JOIN のファンアウトで重複した関連データを Map で排除して集約
	const translationJobs = new Map(
		rows
			.filter((row) => row.translationJobId)
			.map((row) => [
				row.translationJobId,
				{
					id: row.translationJobId,
					pageId: row.translationJobPageId,
					userId: row.translationJobUserId,
					locale: row.translationJobLocale,
					aiModel: row.translationJobAiModel,
					status: row.translationJobStatus,
					progress: row.translationJobProgress,
					error: row.translationJobError,
					createdAt: row.translationJobCreatedAt,
					updatedAt: row.translationJobUpdatedAt,
				},
			]),
	);
	const translationProofs = new Map(
		rows
			.filter((row) => row.proofLocale)
			.map((row) => [
				row.proofLocale,
				{
					locale: row.proofLocale,
					translationProofStatus: row.translationProofStatus,
				},
			]),
	);

	return {
		sourceLocale: TIPITAKA_SOURCE_LOCALE,
		translationJobs: Array.from(translationJobs.values()),
		translationProofs: Array.from(translationProofs.values()),
	};
}
