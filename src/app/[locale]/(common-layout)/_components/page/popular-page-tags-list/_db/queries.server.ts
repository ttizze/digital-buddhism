import { db } from "@/db";

/**
 * Fetches popular tags based on usage count
 * Kyselyに移行済み
 * @param limit Maximum number of tags to return
 * @returns Array of popular tags with usage count
 */
export async function fetchPopularTags(limit: number) {
	const results = await db
		.selectFrom("tags")
		.leftJoin("tagPages", "tags.id", "tagPages.tagId")
		.select(["tags.id", "tags.name"])
		.select((eb) => eb.fn.count("tagPages.pageId").as("pagesCount"))
		.groupBy(["tags.id", "tags.name"])
		.orderBy("pagesCount", "desc")
		.limit(limit)
		.execute();

	return results.map((r) => ({
		id: r.id,
		name: r.name,
		_count: {
			pages: r.pagesCount,
		},
	}));
}
