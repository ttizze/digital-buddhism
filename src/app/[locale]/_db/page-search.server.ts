import { sql } from "kysely";
import { db } from "@/db";
import type { PageForList } from "../types";
import { buildPageListQuery, toPageForList } from "./page-list.server";

type SearchResult = {
	pageForLists: PageForList[];
	total: number;
};

async function fetchPagesByIds(
	pageIds: number[],
	locale: string,
): Promise<PageForList[]> {
	if (pageIds.length === 0) return [];

	const rows = await buildPageListQuery(locale)
		.where("tipitakaPages.id", "in", pageIds)
		.execute();
	const rowById = new Map(rows.map((row) => [row.id, row]));
	return pageIds.flatMap((id) => {
		const row = rowById.get(id);
		return row ? [toPageForList(row)] : [];
	});
}

function escapeLikePattern(value: string): string {
	return value
		.replaceAll("\\", "\\\\")
		.replaceAll("%", "\\%")
		.replaceAll("_", "\\_");
}

async function searchPageIds(
	query: string,
	skip: number,
	take: number,
	titleOnly: boolean,
): Promise<{ pageIds: number[]; total: number }> {
	const pattern = `%${escapeLikePattern(query)}%`;
	let resultQuery = db
		.selectFrom("segments")
		.innerJoin("tipitakaPages", "tipitakaPages.id", "segments.tipitakaPageId")
		.select("tipitakaPages.id as pageId")
		.distinct()
		.where(
			sql<boolean>`${sql.ref("segments.text")} like ${pattern} escape '\\'`,
		);

	if (titleOnly) {
		resultQuery = resultQuery.where("segments.number", "=", 0);
	}

	const [count, rows] = await Promise.all([
		db
			.selectFrom(resultQuery.as("searchResults"))
			.select((eb) => eb.fn.countAll<number>().as("count"))
			.executeTakeFirst(),
		resultQuery.orderBy("tipitakaPages.id").limit(take).offset(skip).execute(),
	]);
	return {
		pageIds: rows.map((row) => row.pageId),
		total: Number(count?.count ?? 0),
	};
}

async function searchPages(
	query: string,
	skip: number,
	take: number,
	locale: string,
	titleOnly: boolean,
): Promise<SearchResult> {
	const { pageIds, total } = await searchPageIds(query, skip, take, titleOnly);
	return {
		pageForLists: await fetchPagesByIds(pageIds, locale),
		total,
	};
}

export async function searchPagesByTitle(
	query: string,
	skip: number,
	take: number,
	locale: string,
): Promise<SearchResult> {
	return searchPages(query, skip, take, locale, true);
}

export async function searchPagesByContent(
	query: string,
	skip: number,
	take: number,
	locale: string,
): Promise<SearchResult> {
	return searchPages(query, skip, take, locale, false);
}
