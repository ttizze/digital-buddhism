import { db } from "@/db";

export async function hasSegmentsForPageId(pageId: number): Promise<boolean> {
	const segment = await db
		.selectFrom("segments")
		.select("id")
		.where("tipitakaPageId", "=", pageId)
		.executeTakeFirst();
	return Boolean(segment);
}
