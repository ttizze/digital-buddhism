import { sql } from "kysely";
import {
	searchPagesByContent,
	searchPagesByTitle,
} from "@/app/[locale]/_db/page-search.server";
import type { PageForList } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import { db } from "@/db";
import { sanitizeUser } from "../_utils/sanitize-user";
import type { Category } from "../constants";

export type SearchResultsData = {
	pageSummaries: PageForList[] | undefined;
	users: SanitizedUser[] | undefined;
	totalPages: number;
};

export async function fetchSearchResults({
	query,
	category,
	page,
	locale,
}: {
	query: string;
	category: Category;
	page: number;
	locale: string;
}): Promise<SearchResultsData> {
	if (!query || page < 1) {
		return { pageSummaries: [], users: [], totalPages: 0 };
	}

	const PAGE_SIZE = 10;
	const skip = (page - 1) * PAGE_SIZE;
	const take = PAGE_SIZE;
	let pageSummaries: PageForList[] | undefined;
	let users: SanitizedUser[] | undefined;
	let totalCount = 0;

	switch (category) {
		case "title": {
			const { pageForLists, total } = await searchPagesByTitle(
				query,
				skip,
				take,
				locale,
			);
			pageSummaries = pageForLists;
			totalCount = total;
			break;
		}
		case "content": {
			const { pageForLists, total } = await searchPagesByContent(
				query,
				skip,
				take,
				locale,
			);
			pageSummaries = pageForLists;
			totalCount = total;
			break;
		}
		case "user": {
			const result = await searchUsers(query, skip, take);
			users = result.users;
			totalCount = result.totalCount;
			break;
		}
		default:
			throw new Error("Invalid category");
	}

	return {
		pageSummaries,
		users,
		totalPages: Math.ceil(totalCount / PAGE_SIZE),
	};
}

async function searchUsers(
	query: string,
	skip: number,
	take: number,
): Promise<{ users: SanitizedUser[]; totalCount: number }> {
	const [userResults, countResult] = await Promise.all([
		db
			.selectFrom("users")
			.selectAll()
			.where("name", "like", `%${query}%`)
			.limit(take)
			.offset(skip)
			.execute(),
		db
			.selectFrom("users")
			.select(sql<number>`count(*)`.as("count"))
			.where("name", "like", `%${query}%`)
			.executeTakeFirst(),
	]);
	return {
		users: userResults.map(sanitizeUser),
		totalCount: Number(countResult?.count ?? 0),
	};
}
