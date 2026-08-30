import { db } from "@/db";

/**
 * スラグからTipitakaページを取得する。
 */
export async function findTipitakaPageBySlug(
	slug: string,
): Promise<{ id: number }> {
	const page = await db
		.selectFrom("tipitakaPages")
		.select("id")
		.where("slug", "=", slug)
		.executeTakeFirst();

	if (!page) {
		throw new Error(`Tipitaka page with slug ${slug} not found`);
	}

	return page;
}
