import { db } from "@/db";

export async function hasSegmentsForPageId(pageId: number): Promise<boolean> {
	const result = await db
		.selectFrom("segments")
		.select("id")
		.where("contentId", "=", pageId)
		.limit(1)
		.executeTakeFirst();

	return !!result;
}
