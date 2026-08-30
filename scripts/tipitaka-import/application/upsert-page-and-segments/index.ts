import { createServerLogger } from "@/app/_service/logger.server";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_service/sync-segments";
import { db } from "@/db";
import type { JsonValue, TipitakaPageKind } from "@/drizzle/types";
import { upsertPage } from "./db/mutations.server";
import { syncSegmentMetadataAndAnnotationLinks } from "./sync-segment-metadata-and-annotation-links";
/**
 * ページとセグメントをupsertする（ユースケースフロー）
 *
 * 処理の流れ:
 * 1. ページをupsert
 * 2. セグメントを同期
 * 3. メタデータとアノテーションリンクを同期
 */
export async function upsertPageAndSegments(p: {
	pageSlug: string;
	mdastJson: JsonValue;
	kind: TipitakaPageKind;
	parentId: number | null;
	position: number;
	isVisible: boolean;
	segments: SegmentDraft[];
	segmentTypeId: number | null;
	anchorPageId: number | null;
}) {
	const logger = createServerLogger("upsert-page-and-segments", {
		pageSlug: p.pageSlug,
	});

	logger.debug(
		{
			segmentCount: p.segments.length,
			segmentTypeId: p.segmentTypeId,
			kind: p.kind,
		},
		"Starting transaction to upsert page and segments",
	);

	try {
		const result = await db.transaction().execute(async (tx) => {
			// db操作: ページをupsert
			const page = await upsertPage(tx, {
				pageSlug: p.pageSlug,
				mdastJson: p.mdastJson,
				kind: p.kind,
				parentId: p.parentId,
				position: p.position,
				isVisible: p.isVisible,
			});

			// db操作: セグメントを同期
			const hashToSegmentId = await syncSegments(
				tx,
				page.id,
				p.segments,
				p.segmentTypeId,
			);

			// application: メタデータとアノテーションリンクを同期
			await syncSegmentMetadataAndAnnotationLinks(
				tx,
				hashToSegmentId,
				p.segments,
				page.id,
				p.anchorPageId,
			);

			return page;
		});

		logger.debug({ pageId: result.id }, "Transaction completed successfully");

		return result;
	} catch (error) {
		logger.error({ err: error }, "Transaction failed");
		throw error;
	}
}
