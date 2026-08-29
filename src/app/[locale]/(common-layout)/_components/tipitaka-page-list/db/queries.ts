import { db } from "@/db";
import {
	extractTipitakaPageTree,
	TIPITAKA_ROOT_SLUG,
	TIPITAKA_SYSTEM_USER_HANDLE,
	type TipitakaPageRow,
	type TipitakaPageTreeNode,
} from "../domain/extract-tipitaka-page-tree";

/**
 * Tipiṭaka の正本ページを起点に、公開対象 PAGE の子孫を取得する。
 *
 * ルート自身はインポート仕様上英語 (`sourceLocale = en`) なので一覧には含めず、
 * ルートから辿れるパーリ語 (`sourceLocale = pi`) ページのうち、PUBLIC または
 * 公開日時がある ARCHIVE を返す。
 */
export async function fetchTipitakaPageTree(
	locale: string,
): Promise<TipitakaPageTreeNode[]> {
	const rootPage = await db
		.selectFrom("pages")
		.innerJoin("contents", "contents.id", "pages.id")
		.innerJoin("users", "users.id", "pages.userId")
		.select("pages.id")
		.where("pages.slug", "=", TIPITAKA_ROOT_SLUG)
		.where("users.handle", "=", TIPITAKA_SYSTEM_USER_HANDLE)
		.where("pages.parentId", "is", null)
		.where((eb) =>
			eb.or([
				eb("pages.status", "=", "PUBLIC"),
				eb.and([
					eb("pages.status", "=", "ARCHIVE"),
					eb("pages.publishedAt", "is not", null),
				]),
			]),
		)
		.where("contents.kind", "=", "PAGE")
		.executeTakeFirst();

	if (!rootPage) return [];

	const rows = await db
		.selectFrom("pages")
		// SQLite が巨大な segments 全体を先に走査しないよう、pages を駆動表に固定する。
		.crossJoin("segments")
		.innerJoin("contents", "contents.id", "pages.id")
		.innerJoin("users", "users.id", "pages.userId")
		.where((eb) =>
			eb.or([
				eb("pages.status", "=", "PUBLIC"),
				eb.and([
					eb("pages.status", "=", "ARCHIVE"),
					eb("pages.publishedAt", "is not", null),
				]),
			]),
		)
		.where("contents.kind", "=", "PAGE")
		.whereRef("segments.contentId", "=", "pages.id")
		.where("segments.number", "=", 0)
		.select((eb) => [
			"pages.id",
			"pages.slug",
			"pages.parentId",
			"pages.order",
			"pages.publishedAt",
			"pages.sourceLocale",
			"pages.status",
			"contents.kind as contentKind",
			"users.handle as userHandle",
			"segments.id as titleSegmentId",
			"segments.text as titleText",
			eb
				.selectFrom("segmentTranslations")
				.leftJoin("translationVotes as ownerTv", (join) =>
					join
						.onRef("ownerTv.translationId", "=", "segmentTranslations.id")
						.onRef("ownerTv.userId", "=", "pages.userId")
						.on("ownerTv.isUpvote", "=", true),
				)
				.select("segmentTranslations.text")
				.whereRef("segmentTranslations.segmentId", "=", "segments.id")
				.where("segmentTranslations.locale", "=", locale)
				.orderBy("ownerTv.isUpvote", (ob) => ob.desc().nullsLast())
				.orderBy("segmentTranslations.point", "desc")
				.orderBy("segmentTranslations.createdAt", "desc")
				.limit(1)
				.as("titleTranslationText"),
		])
		.orderBy("pages.parentId")
		.orderBy("pages.order")
		.execute();

	return extractTipitakaPageTree(
		rows satisfies readonly TipitakaPageRow[],
		rootPage.id,
	);
}

export { TIPITAKA_SOURCE_LOCALE } from "../domain/extract-tipitaka-page-tree";
