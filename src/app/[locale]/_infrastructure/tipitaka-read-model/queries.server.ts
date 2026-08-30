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

export async function queryBestTranslationTextsForPage(
	pageId: number,
	locale: string,
): Promise<Record<string, string>> {
	const rows = await db
		.selectFrom("segmentTranslations as candidate")
		.innerJoin("segments", "segments.id", "candidate.segmentId")
		.leftJoin("selectedSegmentTranslations as selected", (join) =>
			join
				.onRef("selected.translationId", "=", "candidate.id")
				.onRef("selected.segmentId", "=", "candidate.segmentId")
				.onRef("selected.locale", "=", "candidate.locale"),
		)
		.select([
			"candidate.id",
			"candidate.segmentId",
			"candidate.text",
			"candidate.point",
			"candidate.createdAt",
			"selected.translationId as selectedTranslationId",
		])
		.where("segments.tipitakaPageId", "=", pageId)
		.where("candidate.locale", "=", locale)
		.orderBy("candidate.segmentId")
		.orderBy("selected.translationId", (order) => order.desc().nullsLast())
		.orderBy("candidate.point", "desc")
		.orderBy("candidate.createdAt", "desc")
		.orderBy("candidate.id", "desc")
		.execute();

	const translations: Record<string, string> = {};
	for (const row of rows) {
		const key = String(row.segmentId);
		translations[key] ??= row.text;
	}
	return translations;
}
