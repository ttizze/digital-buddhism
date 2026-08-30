import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { TransactionClient } from "./types";

export type { TransactionClient } from "./types";

import {
	deleteStaleSegments,
	fetchExistingSegments,
	getSegmentTypeId,
	offsetSegmentNumbers,
	upsertSegmentBatch,
} from "./db/mutations.server";

const SEGMENT_UPSERT_CHUNK_SIZE = 200;

export async function syncSegments(
	tx: TransactionClient,
	pageId: number,
	drafts: SegmentDraft[],
	segmentTypeId: number | null,
): Promise<Map<string, number>> {
	const resolvedSegmentTypeId = await getSegmentTypeId(tx, segmentTypeId);
	const existingSegments = await fetchExistingSegments(
		tx,
		pageId,
		resolvedSegmentTypeId,
	);
	const staleHashes = new Set(
		existingSegments.map((segment) => segment.textAndOccurrenceHash),
	);

	if (existingSegments.length > 0) {
		await offsetSegmentNumbers(tx, pageId, resolvedSegmentTypeId);
	}

	const hashToSegmentId = new Map<string, number>();
	for (
		let index = 0;
		index < drafts.length;
		index += SEGMENT_UPSERT_CHUNK_SIZE
	) {
		const chunk = drafts.slice(index, index + SEGMENT_UPSERT_CHUNK_SIZE);
		const upsertedSegmentIds = await upsertSegmentBatch(
			tx,
			pageId,
			resolvedSegmentTypeId,
			chunk,
		);
		for (const [hash, segmentId] of upsertedSegmentIds) {
			hashToSegmentId.set(hash, segmentId);
			staleHashes.delete(hash);
		}
	}

	await deleteStaleSegments(tx, pageId, resolvedSegmentTypeId, staleHashes);
	return hashToSegmentId;
}
