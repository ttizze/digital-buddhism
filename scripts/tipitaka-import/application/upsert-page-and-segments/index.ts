import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_service/sync-segments";
import { db } from "@/db";
import type { Root } from "mdast";
import type { TipitakaTextLevel } from "@/drizzle/types";
import { createCliLogger } from "../../logger";
import { upsertPage } from "./db/mutations.server";
import { syncPageSegmentMetadata } from "./sync-segment-metadata-and-annotation-links";

export interface UpsertPageAndSegmentsInput {
	catalogKey: string;
	pageSlug: string;
	mdastJson: Root;
	textLevel: TipitakaTextLevel | null;
	parentId: number | null;
	position: number;
	importFileId: number | null;
	segments: SegmentDraft[];
}

/** Atomically upserts one page, its segments, and their source metadata. */
export async function upsertPageAndSegments(p: UpsertPageAndSegmentsInput) {
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

		logger.debug("Page transaction completed", {
			pageId: result.id,
			segmentCount: p.segments.length,
		});
		return result;
	} catch (error) {
		logger.error("Page transaction failed", {
			err: error instanceof Error ? error : String(error),
		});
		throw error;
	}
}
