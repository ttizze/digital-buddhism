import { db } from "@/db";

function buildTipitakaPagesQuery() {
	return db.selectFrom("tipitakaPages");
}

export async function countPublicPages(): Promise<number> {
	const result = await buildTipitakaPagesQuery()
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
	const pages = await buildTipitakaPagesQuery()
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
