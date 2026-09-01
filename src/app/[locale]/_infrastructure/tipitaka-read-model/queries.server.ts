import { TIPITAKA_ROOT_SLUG } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { db } from "@/db";

export type ReadModelPage = {
	id: number;
	slug: string;
};

export async function queryReadModelPages(): Promise<ReadModelPage[]> {
	return db
		.selectFrom("tipitakaPages")
		.select(["id", "slug"])
		.orderBy("id")
		.execute();
}

export async function queryTipitakaRootPageId(): Promise<number | null> {
	const root = await db
		.selectFrom("tipitakaPages")
		.select("id")
		.where("slug", "=", TIPITAKA_ROOT_SLUG)
		.where("parentId", "is", null)
		.executeTakeFirst();
	return root?.id ?? null;
}

export async function queryTranslationLocales(): Promise<string[]> {
	const rows = await db
		.selectFrom("segmentTranslations")
		.select("locale")
		.distinct()
		.orderBy("locale")
		.execute();
	return rows.map((row) => row.locale);
}

export type TranslationPageLocale = {
	pageId: number;
	locale: string;
};

export async function queryTranslationPageLocales(): Promise<
	TranslationPageLocale[]
> {
	return db
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segments.id", "segmentTranslations.segmentId")
		.select(["segments.tipitakaPageId as pageId", "segmentTranslations.locale"])
		.distinct()
		.orderBy("segments.tipitakaPageId")
		.orderBy("segmentTranslations.locale")
		.execute();
}

/**
 * bestTranslationTextSubquery（相関サブクエリ版）と同じランキングのページ一括版:
 * 採用訳 → 得票 → 新しさ → id。変更する場合は両方を揃えること
 * （乖離は best-translation-subquery.server.integration.test.ts の一致テストが検知する）。
 */
export async function queryBestTranslationTextsForPage(
	pageId: number,
	locale: string,
): Promise<Record<string, string>> {
	const rows = await db
		.selectFrom("segmentTranslations as candidateTranslation")
		.innerJoin("segments", "segments.id", "candidateTranslation.segmentId")
		.leftJoin("selectedSegmentTranslations as selectedTranslation", (join) =>
			join
				.onRef(
					"selectedTranslation.translationId",
					"=",
					"candidateTranslation.id",
				)
				.onRef(
					"selectedTranslation.segmentId",
					"=",
					"candidateTranslation.segmentId",
				)
				.onRef(
					"selectedTranslation.locale",
					"=",
					"candidateTranslation.locale",
				),
		)
		.select(["candidateTranslation.segmentId", "candidateTranslation.text"])
		.where("segments.tipitakaPageId", "=", pageId)
		.where("candidateTranslation.locale", "=", locale)
		.orderBy("candidateTranslation.segmentId")
		.orderBy("selectedTranslation.translationId", (ob) => ob.desc().nullsLast())
		.orderBy("candidateTranslation.point", "desc")
		.orderBy("candidateTranslation.createdAt", "desc")
		.orderBy("candidateTranslation.id", "desc")
		.execute();

	// セグメントごとに最初の行（=ベスト訳）を採用する
	const translations: Record<string, string> = {};
	for (const row of rows) {
		const key = String(row.segmentId);
		translations[key] ??= row.text;
	}
	return translations;
}
