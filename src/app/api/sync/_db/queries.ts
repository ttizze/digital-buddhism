import { db } from "@/db";

export async function findTitleSegmentText(pageId: number) {
	const segment = await db
		.selectFrom("segments")
		.select("text")
		.where("contentId", "=", pageId)
		.where("number", "=", 0)
		.executeTakeFirst();

	return segment?.text;
}
