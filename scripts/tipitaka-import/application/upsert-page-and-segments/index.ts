import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_service/sync-segments";
import { db } from "@/db";
import type { JsonValue, TipitakaTextLevel } from "@/drizzle/types";
import { createCliLogger } from "../../logger";
import { upsertPage } from "./db/mutations.server";
import { syncPageSegmentMetadata } from "./sync-segment-metadata-and-annotation-links";

/** Atomically upserts one page, its segments, and their source metadata. */
export async function upsertPageAndSegments(p: {
	catalogKey: string;
	pageSlug: string;
	mdastJson: JsonValue;
	textLevel: TipitakaTextLevel | null;
	parentId: number | null;
	position: number;
	importFileId: number | null;
	segments: SegmentDraft[];
}) {
	const logger = createCliLogger("upsert-page-and-segments", {
		catalogKey: p.catalogKey,
		pageSlug: p.pageSlug,
	});

	try {
		const result = await db.transaction().execute(async (tx) => {
			const page = await upsertPage(tx, p);
			const hashToSegmentId = await syncSegments(tx, page.id, p.segments);
			await syncPageSegmentMetadata(tx, hashToSegmentId, p.segments);
			return page;
		});

		logger.debug(
			{ pageId: result.id, segmentCount: p.segments.length },
			"Page transaction completed",
		);
		return result;
	} catch (error) {
		logger.error({ err: error }, "Page transaction failed");
		throw error;
	}
}
