/** ページリスト取得用クエリ */

import { db } from "@/db";
import type { PageStatus } from "@/drizzle/types";
import type { PageForList, TitleSegment } from "../types";
import { bestTranslationTextSubquery } from "./best-translation-subquery.server";

// ============================================
// 内部型定義
// ============================================

type PageListParams = {
	page: number;
	pageSize: number;
	pageOwnerId?: string;
	locale: string;
};

type PaginatedResult = {
	pageForLists: PageForList[];
	totalPages: number;
};

/**
 * 総ページ数を取得
 */
async function fetchTotalCount(
	status: PageStatus,
	parentId: number | null,
	userId?: string,
): Promise<number> {
	let query = db
		.selectFrom("pages")
		.select((eb) => eb.fn.countAll().as("count"))
		.where("status", "=", status);

	if (parentId === null) {
		query = query.where("parentId", "is", null);
	} else {
		query = query.where("parentId", "=", parentId);
	}

	if (userId) {
		query = query.where("userId", "=", userId);
	}

	const result = await query.executeTakeFirst();
	return Number(result?.count ?? 0);
}

/**
 * クエリ結果をPageForListに変換
 */
type PageRow = Awaited<
	ReturnType<ReturnType<typeof buildPageListQuery>["execute"]>
>[number];

function toTitleSegment(row: PageRow): TitleSegment {
	return {
		id: row.segmentId,
		pageId: row.id,
		number: 0,
		text: row.segmentText,
		translationText: row.translationText ?? null,
	};
}

export function toPageForList(row: PageRow): PageForList {
	return {
		id: row.id,
		slug: row.slug,
		createdAt: row.createdAt,
		status: row.status,
		userHandle: row.userHandle,
		userName: row.userName,
		userImage: row.userImage,
		titleSegment: toTitleSegment(row),
	};
}

/**
 * ページリストのベースクエリを構築
 * ページ + ユーザー + タイトルセグメント + 最良翻訳を1クエリで取得
 */
export function buildPageListQuery(locale: string) {
	return (
		db
			.selectFrom("pages")
			.innerJoin("users", "pages.userId", "users.id")
			// タイトルセグメント (number = 0)
			.innerJoin(
				(eb) =>
					eb
						.selectFrom("segments")
						.select([
							"segments.id",
							"segments.contentId",
							"segments.text",
							"segments.number",
						])
						.where("segments.number", "=", 0)
						.as("seg"),
				(join) => join.onRef("seg.contentId", "=", "pages.id"),
			)
			.select((eb) => [
				"pages.id",
				"pages.slug",
				"pages.createdAt",
				"pages.status",
				// user
				"users.name as userName",
				"users.handle as userHandle",
				"users.image as userImage",
				// segment
				"seg.id as segmentId",
				"seg.text as segmentText",
				// translation
				bestTranslationTextSubquery({
					locale,
					ownerId: eb.ref("pages.userId"),
					segmentId: eb.ref("seg.id"),
				}).as("translationText"),
			])
	);
}

// ============================================
// 公開API
// ============================================

/**
 * 新着ページリストを取得
 */
export async function fetchPaginatedNewPageLists({
	page = 1,
	pageSize = 9,
	pageOwnerId,
	locale = "en",
}: PageListParams): Promise<PaginatedResult> {
	const offset = (page - 1) * pageSize;

	let query = buildPageListQuery(locale)
		.where("pages.status", "=", "PUBLIC")
		.where("pages.parentId", "is", null);

	if (pageOwnerId) {
		query = query.where("pages.userId", "=", pageOwnerId);
	}

	const rows = await query
		.orderBy("pages.createdAt", "desc")
		.limit(pageSize)
		.offset(offset)
		.execute();

	const total = await fetchTotalCount("PUBLIC", null, pageOwnerId);

	return {
		pageForLists: rows.map(toPageForList),
		totalPages: Math.ceil(total / pageSize),
	};
}
