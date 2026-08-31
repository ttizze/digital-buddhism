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

export async function upsertSegmentBatch(
	tx: TransactionClient,
	pageId: number,
	drafts: SegmentDraft[],
): Promise<Map<string, number>> {
	if (drafts.length === 0) return new Map();

	const segments = await tx
		.insertInto("segments")
		.values(
			drafts.map((draft) => ({
				tipitakaPageId: pageId,
				text: draft.text,
				number: draft.number,
				textAndOccurrenceHash: draft.textAndOccurrenceHash,
				sourceBookCode: draft.sourceBookCode ?? null,
				sourceChapterNumber: draft.sourceChapterNumber ?? null,
				sourceParagraphNumber: draft.sourceParagraphNumber ?? null,
				sourceParagraphOccurrence: draft.sourceParagraphOccurrence ?? null,
			})),
		)
		.onConflict((conflict) =>
			conflict
				.columns(["tipitakaPageId", "textAndOccurrenceHash"])
				.doUpdateSet((eb) => ({
					number: eb.ref("excluded.number"),
					text: eb.ref("excluded.text"),
					sourceBookCode: eb.ref("excluded.sourceBookCode"),
					sourceChapterNumber: eb.ref("excluded.sourceChapterNumber"),
					sourceParagraphNumber: eb.ref("excluded.sourceParagraphNumber"),
					sourceParagraphOccurrence: eb.ref(
						"excluded.sourceParagraphOccurrence",
					),
				})),
		)
		.returning(["id", "textAndOccurrenceHash"])
		.execute();

	return new Map(
		segments.map((segment) => [segment.textAndOccurrenceHash, segment.id]),
	);
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
