import { bestTranslationTextSubquery } from "@/app/[locale]/_db/best-translation-subquery.server";
import { db } from "@/db";
import {
	extractTipitakaPageTree,
	TIPITAKA_ROOT_SLUG,
	type TipitakaPageRow,
	type TipitakaPageTreeNode,
} from "../domain/extract-tipitaka-page-tree";

export async function fetchTipitakaPageTree(
	locale: string,
): Promise<TipitakaPageTreeNode[]> {
	const rootPage = await db
		.selectFrom("tipitakaPages")
		.select("id")
		.where("slug", "=", TIPITAKA_ROOT_SLUG)
		.where("kind", "=", "ROOT")
		.where("isVisible", "=", true)
		.executeTakeFirst();
	if (!rootPage) return [];

	const rows = await db
		.withRecursive("tipitakaDescendants", (qb) =>
			qb
				.selectFrom("tipitakaPages")
				.select(["id", "slug", "parentId", "position"])
				.where("parentId", "=", rootPage.id)
				.where("isVisible", "=", true)
				.unionAll(
					qb
						.selectFrom("tipitakaPages")
						.innerJoin(
							"tipitakaDescendants",
							"tipitakaPages.parentId",
							"tipitakaDescendants.id",
						)
						.select([
							"tipitakaPages.id",
							"tipitakaPages.slug",
							"tipitakaPages.parentId",
							"tipitakaPages.position",
						])
						.where("tipitakaPages.isVisible", "=", true),
				),
		)
		.selectFrom("tipitakaDescendants")
		.innerJoin("segments", (join) =>
			join
				.onRef("segments.tipitakaPageId", "=", "tipitakaDescendants.id")
				.on("segments.number", "=", 0),
		)
		.select((eb) => [
			"tipitakaDescendants.id",
			"tipitakaDescendants.slug",
			"tipitakaDescendants.parentId",
			"tipitakaDescendants.position",
			"segments.id as titleSegmentId",
			"segments.text as titleText",
			bestTranslationTextSubquery({
				locale,
				segmentId: eb.ref("segments.id"),
			}).as("titleTranslationText"),
		])
		.orderBy("tipitakaDescendants.parentId")
		.orderBy("tipitakaDescendants.position")
		.execute();

	return extractTipitakaPageTree(
		rows satisfies readonly TipitakaPageRow[],
		rootPage.id,
	);
}

export { TIPITAKA_SOURCE_LOCALE } from "../domain/extract-tipitaka-page-tree";
