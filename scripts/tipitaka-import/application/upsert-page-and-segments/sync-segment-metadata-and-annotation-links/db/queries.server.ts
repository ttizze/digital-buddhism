import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import type { SegmentTypeKey } from "@/drizzle/types";

export async function fetchSegmentTypeKey(
	tx: TransactionClient,
	pageId: number,
): Promise<SegmentTypeKey | undefined> {
	const segment = await tx
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segmentTypes.id", "segments.segmentTypeId")
		.select("segmentTypes.key as segmentTypeKey")
		.where("segments.tipitakaPageId", "=", pageId)
		.executeTakeFirst();
	return segment?.segmentTypeKey;
}
