import { sql } from "kysely";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { ExistingSegment, TransactionClient } from "../types";

export async function fetchExistingSegments(
	tx: TransactionClient,
	pageId: number,
): Promise<ExistingSegment[]> {
	return tx
		.selectFrom("segments")
		.select(["id", "text", "number", "textAndOccurrenceHash"])
		.where("tipitakaPageId", "=", pageId)
		.execute();
}

export async function offsetSegmentNumbers(
	tx: TransactionClient,
	pageId: number,
): Promise<void> {
	await tx
		.updateTable("segments")
		.set({ number: sql`number + 1000000` })
		.where("tipitakaPageId", "=", pageId)
		.execute();
}

async function upsertSingleSegment(
	tx: TransactionClient,
	pageId: number,
	draft: SegmentDraft,
): Promise<{ hash: string; segmentId: number }> {
	const locator = {
		sourceBookCode: draft.sourceBookCode ?? null,
		sourceChapterNumber: draft.sourceChapterNumber ?? null,
		sourceParagraphNumber: draft.sourceParagraphNumber ?? null,
		sourceParagraphOccurrence: draft.sourceParagraphOccurrence ?? null,
	};
	const segment = await tx
		.insertInto("segments")
		.values({
			tipitakaPageId: pageId,
			text: draft.text,
			number: draft.number,
			textAndOccurrenceHash: draft.textAndOccurrenceHash,
			...locator,
		})
		.onConflict((conflict) =>
			conflict
				.columns(["tipitakaPageId", "textAndOccurrenceHash"])
				.doUpdateSet({
					number: draft.number,
					text: draft.text,
					...locator,
				}),
		)
		.returning("id")
		.executeTakeFirstOrThrow();
	return { hash: draft.textAndOccurrenceHash, segmentId: segment.id };
}

export async function upsertSegmentBatch(
	tx: TransactionClient,
	pageId: number,
	drafts: SegmentDraft[],
): Promise<Map<string, number>> {
	const segmentIdsByHash = new Map<string, number>();
	const results = await Promise.all(
		drafts.map((draft) => upsertSingleSegment(tx, pageId, draft)),
	);
	for (const { hash, segmentId } of results) {
		segmentIdsByHash.set(hash, segmentId);
	}
	return segmentIdsByHash;
}

export async function deleteStaleSegments(
	tx: TransactionClient,
	pageId: number,
	hashesToDelete: Set<string>,
): Promise<void> {
	if (hashesToDelete.size === 0) return;
	await tx
		.deleteFrom("segments")
		.where("tipitakaPageId", "=", pageId)
		.where("textAndOccurrenceHash", "in", [...hashesToDelete])
		.execute();
}
