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

async function searchPageIds(
	query: string,
	titleOnly: boolean,
): Promise<number[]> {
	let resultQuery = db
		.selectFrom("segments")
		.innerJoin("tipitakaPages", "tipitakaPages.id", "segments.tipitakaPageId")
		.select("tipitakaPages.id as pageId")
		.distinct()
		.where("segments.text", "like", `%${query}%`);

	if (titleOnly) {
		resultQuery = resultQuery.where("segments.number", "=", 0);
	}

	const rows = await resultQuery.orderBy("tipitakaPages.id").execute();
	return rows.map((row) => row.pageId);
}

async function searchPages(
	query: string,
	skip: number,
	take: number,
	locale: string,
	titleOnly: boolean,
): Promise<SearchResult> {
	const allPageIds = await searchPageIds(query, titleOnly);
	const pageIds = allPageIds.slice(skip, skip + take);
	return {
		pageForLists: await fetchPagesByIds(pageIds, locale),
		total: allPageIds.length,
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
