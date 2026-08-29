import { createServerLogger } from "@/app/_service/logger.server";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import { syncAnnotationLinksByParagraphNumber } from "../sync-annotation-links-by-paragraph-number";
import { syncSegmentMetadata } from "./db/mutations.server";
import { fetchSegmentTypeKey } from "./db/queries.server";
import { collectAnnotationSegmentsBeforeFirstParagraph } from "./domain/collect-annotation-segments-before-first-paragraph";
import { collectMetadataDrafts } from "./domain/collect-metadata-drafts";
import { groupAnnotationSegmentsByParagraphNumber } from "./domain/group-annotation-segments-by-paragraph-number";

/**
 * SegmentDraft のメタデータを同期し、段落番号を使ってアノテーションリンクを作成する
 *
 * 処理の流れ:
 * 1. domainロジックでメタデータドラフトを収集
 * 2. domainロジックで段落番号ごとにグループ化
 * 3. db操作でメタデータを同期
 * 4. db操作でアノテーションリンクを作成
 */
export async function syncSegmentMetadataAndAnnotationLinks(
	tx: TransactionClient,
	hashToSegmentId: Map<string, number>,
	segments: SegmentDraft[],
	pageId: number,
	anchorPageId: number | null,
): Promise<void> {
	const logger = createServerLogger("sync-segment-metadata-and-links", {
		pageId,
		anchorPageId,
	});

	// 同期対象のセグメントIDのセット
	const segmentIds = new Set(hashToSegmentId.values());

	logger.debug(
		{ segmentCount: segmentIds.size, anchorPageId },
		"Starting metadata and annotation links sync",
	);

	// domainロジック: メタデータドラフトを収集
	const metadataDrafts = collectMetadataDrafts(hashToSegmentId, segments);

	// db操作: メタデータを同期
	await syncSegmentMetadata(tx, segmentIds, metadataDrafts);

	// COMMENTARYページだけを対応する本文ページへリンクする。
	const segmentTypeKey = await fetchSegmentTypeKey(tx, pageId);

	if (segmentTypeKey !== "COMMENTARY" || !anchorPageId) {
		return;
	}

	// domainロジック: 段落番号ごとにグループ化
	const paragraphNumberToAnnotationSegmentIds =
		groupAnnotationSegmentsByParagraphNumber(hashToSegmentId, segments);
	const annotationSegmentsBeforeFirstParagraph =
		collectAnnotationSegmentsBeforeFirstParagraph(hashToSegmentId, segments);

	if (
		paragraphNumberToAnnotationSegmentIds.size > 0 ||
		annotationSegmentsBeforeFirstParagraph
	) {
		const annotationSegmentIds = Array.from(
			paragraphNumberToAnnotationSegmentIds.values(),
		).flat();

		logger.debug(
			{
				annotationSegmentCount: annotationSegmentIds.length,
				paragraphCount: paragraphNumberToAnnotationSegmentIds.size,
			},
			"Syncing annotation links",
		);

		await syncAnnotationLinksByParagraphNumber(
			tx,
			pageId,
			paragraphNumberToAnnotationSegmentIds,
			anchorPageId,
			annotationSegmentsBeforeFirstParagraph,
		);
	}
}
