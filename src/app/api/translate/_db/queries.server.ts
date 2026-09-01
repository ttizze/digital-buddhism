import { db } from "@/db";

/** ページのセグメントを取得する。 */
export async function getPageSegments(pageId: number) {
	return await db
		.selectFrom("segments")
		.select(["segments.id", "segments.number", "segments.text"])
		.where("segments.tipitakaPageId", "=", pageId)
		.execute();
}

/** 進捗計算用にセグメントIDだけを取得する（本文は読まない）。 */
export async function getPageSegmentIds(pageId: number): Promise<number[]> {
	const rows = await db
		.selectFrom("segments")
		.select("segments.id")
		.where("segments.tipitakaPageId", "=", pageId)
		.execute();
	return rows.map((row) => row.id);
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
