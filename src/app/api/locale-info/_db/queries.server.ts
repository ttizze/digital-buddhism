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
			"translationJobs.locale as translationJobLocale",
			"pageLocaleTranslationProofs.locale as proofLocale",
			"pageLocaleTranslationProofs.translationProofStatus",
		])
		.where("tipitakaPages.slug", "=", pageSlug)
		.execute();

	if (rows.length === 0) {
		return null;
	}

	// JOIN のファンアウトで重複した関連データを排除して集約する。
	const translatedLocales = new Set<string>();
	const translationProofs = new Map<
		string,
		{
			locale: string;
			translationProofStatus: NonNullable<
				(typeof rows)[number]["translationProofStatus"]
			>;
		}
	>();
	for (const row of rows) {
		if (row.translationJobLocale) {
			translatedLocales.add(row.translationJobLocale);
		}
		if (row.proofLocale && row.translationProofStatus) {
			translationProofs.set(row.proofLocale, {
				locale: row.proofLocale,
				translationProofStatus: row.translationProofStatus,
			});
		}
	}

	return {
		sourceLocale: TIPITAKA_SOURCE_LOCALE,
		translatedLocales: Array.from(translatedLocales),
		translationProofs: Array.from(translationProofs.values()),
	};
}
