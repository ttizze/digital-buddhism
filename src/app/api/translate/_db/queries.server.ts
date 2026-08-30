import { db } from "@/db";

/** ページのセグメントを取得する。 */
export async function getPageSegments(pageId: number) {
	return await db
		.selectFrom("segments")
		.select(["segments.id", "segments.number", "segments.text"])
		.where("segments.tipitakaPageId", "=", pageId)
		.execute();
}

/** ページタイトル（セグメント番号0のテキスト）を取得する。 */
export async function getPageTitle(pageId: number): Promise<string | null> {
	const result = await db
		.selectFrom("segments")
		.select("segments.text")
		.where("segments.tipitakaPageId", "=", pageId)
		.where("segments.number", "=", 0)
		.executeTakeFirst();
	return result?.text ?? null;
}
