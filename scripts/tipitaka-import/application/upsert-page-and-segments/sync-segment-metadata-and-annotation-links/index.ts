import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import { syncSegmentMetadata } from "./db/mutations.server";
import { collectMetadataDrafts } from "./domain/collect-metadata-drafts";

/** Synchronizes source metadata for every segment on one page. */
export async function syncPageSegmentMetadata(
	tx: TransactionClient,
	hashToSegmentId: Map<string, number>,
	segments: SegmentDraft[],
): Promise<void> {
	await syncSegmentMetadata(
		tx,
		new Set(hashToSegmentId.values()),
		collectMetadataDrafts(hashToSegmentId, segments),
	);
}
