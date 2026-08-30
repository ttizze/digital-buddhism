import { TIPITAKA_ROOT_SLUG } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { db } from "@/db";

function buildVisibleTipitakaPagesQuery() {
	return db
		.withRecursive("visibleTipitakaPages", (qb) =>
			qb
				.selectFrom("tipitakaPages")
				.select("id")
				.where("slug", "=", TIPITAKA_ROOT_SLUG)
				.where("kind", "=", "ROOT")
				.where("isVisible", "=", true)
				.unionAll(
					qb
						.selectFrom("tipitakaPages")
						.innerJoin(
							"visibleTipitakaPages",
							"tipitakaPages.parentId",
							"visibleTipitakaPages.id",
						)
						.select("tipitakaPages.id")
						.where("tipitakaPages.isVisible", "=", true),
				),
		)
		.selectFrom("tipitakaPages")
		.innerJoin(
			"visibleTipitakaPages",
			"visibleTipitakaPages.id",
			"tipitakaPages.id",
		);
}

export async function countPublicPages(): Promise<number> {
	const result = await buildVisibleTipitakaPagesQuery()
		.select((eb) => eb.fn.countAll<number>().as("count"))
		.executeTakeFirst();
	return Number(result?.count ?? 0);
}

export async function fetchTipitakaPagesWithTranslationsChunk({
	limit,
	offset,
}: {
	limit: number;
	offset: number;
}) {
	const pages = await buildVisibleTipitakaPagesQuery()
		.select([
			"tipitakaPages.id as pageId",
			"tipitakaPages.slug",
			"tipitakaPages.updatedAt",
		])
		.orderBy("tipitakaPages.id", "asc")
		.limit(limit)
		.offset(offset)
		.execute();
	if (pages.length === 0) return [];

	const completedJobs = await db
		.selectFrom("translationJobs")
		.select(["pageId", "locale"])
		.distinct()
		.where(
			"pageId",
			"in",
			pages.map((page) => page.pageId),
		)
		.where("status", "=", "COMPLETED")
		.execute();
	const localesByPageId = new Map<number, string[]>();
	for (const job of completedJobs) {
		const locales = localesByPageId.get(job.pageId) ?? [];
		locales.push(job.locale);
		localesByPageId.set(job.pageId, locales);
	}

	return pages.map((page) => ({
		slug: page.slug,
		updatedAt: page.updatedAt,
		translationLocales: localesByPageId.get(page.pageId) ?? [],
	}));
}
