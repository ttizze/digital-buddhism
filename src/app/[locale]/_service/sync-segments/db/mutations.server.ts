import { sql } from "kysely";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { ExistingSegment, TransactionClient } from "../types";

export async function getSegmentTypeId(
	tx: TransactionClient,
	segmentTypeId: number | null,
): Promise<number> {
	if (segmentTypeId !== null) return segmentTypeId;

	const segmentType = await tx
		.selectFrom("segmentTypes")
		.select("id")
		.where("key", "=", "PRIMARY")
		.executeTakeFirst();
	if (!segmentType) throw new Error("Primary segment type not found");
	return segmentType.id;
}

export async function fetchExistingSegments(
	tx: TransactionClient,
	pageId: number,
	segmentTypeId: number,
): Promise<ExistingSegment[]> {
	return tx
		.selectFrom("segments")
		.select(["id", "text", "number", "textAndOccurrenceHash"])
		.where("tipitakaPageId", "=", pageId)
		.where("segmentTypeId", "=", segmentTypeId)
		.execute();
}

export async function offsetSegmentNumbers(
	tx: TransactionClient,
	pageId: number,
	segmentTypeId: number,
): Promise<void> {
	await tx
		.updateTable("segments")
		.set({ number: sql`number + 1000000` })
		.where("tipitakaPageId", "=", pageId)
		.where("segmentTypeId", "=", segmentTypeId)
		.execute();
}

async function upsertSingleSegment(
	tx: TransactionClient,
	pageId: number,
	segmentTypeId: number,
	draft: SegmentDraft,
): Promise<{ hash: string; segmentId: number }> {
	const segment = await tx
		.insertInto("segments")
		.values({
			tipitakaPageId: pageId,
			text: draft.text,
			number: draft.number,
			textAndOccurrenceHash: draft.textAndOccurrenceHash,
			segmentTypeId,
		})
		.onConflict((conflict) =>
			conflict
				.columns(["tipitakaPageId", "textAndOccurrenceHash"])
				.doUpdateSet({ number: draft.number, segmentTypeId }),
		)
		.returning("id")
		.executeTakeFirstOrThrow();
	return { hash: draft.textAndOccurrenceHash, segmentId: segment.id };
}

export async function upsertSegmentBatch(
	tx: TransactionClient,
	pageId: number,
	segmentTypeId: number,
	drafts: SegmentDraft[],
): Promise<Map<string, number>> {
	const segmentIdsByHash = new Map<string, number>();
	const results = await Promise.all(
		drafts.map((draft) =>
			upsertSingleSegment(tx, pageId, segmentTypeId, draft),
		),
	);
	for (const { hash, segmentId } of results) {
		segmentIdsByHash.set(hash, segmentId);
	}
	return segmentIdsByHash;
}

export async function deleteStaleSegments(
	tx: TransactionClient,
	pageId: number,
	segmentTypeId: number,
	hashesToDelete: Set<string>,
): Promise<void> {
	if (hashesToDelete.size === 0) return;
	await tx
		.deleteFrom("segments")
		.where("tipitakaPageId", "=", pageId)
		.where("segmentTypeId", "=", segmentTypeId)
		.where("textAndOccurrenceHash", "in", [...hashesToDelete])
		.execute();
}
