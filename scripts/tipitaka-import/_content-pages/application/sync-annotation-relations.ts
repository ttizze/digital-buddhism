import { db } from "@/db";
import type { TipitakaTextLevel } from "@/drizzle/types";
import { createCliLogger } from "../../logger";
import type { TipitakaFileMeta } from "../../types";
import {
	type AnnotationTargetPage,
	type LocatedSegment,
	resolveAnnotationLinks,
} from "../domain/resolve-annotation-links";

const logger = createCliLogger("tipitaka-import");
const INSERT_CHUNK_SIZE = 400;

interface SyncAnnotationRelationsResult {
	pageTargetCount: number;
	segmentLinkCount: number;
	matchedParagraphGroupCount: number;
	unmatchedParagraphGroupCount: number;
}

export interface ImportedContentPage {
	id: number;
	position: number;
}

function chunks<T>(values: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let index = 0; index < values.length; index += size) {
		result.push(values.slice(index, index + size));
	}
	return result;
}

export async function syncAnnotationRelations(
	fileMetas: TipitakaFileMeta[],
	pagesByFileKey: ReadonlyMap<string, ImportedContentPage[]>,
	relationOwnerPageIds: number[],
): Promise<SyncAnnotationRelationsResult> {
	const metaByFileKey = new Map(
		fileMetas.map((fileMeta) => [fileMeta.fileKey, fileMeta]),
	);
	const importedPages = fileMetas.flatMap((fileMeta) => {
		const pages = pagesByFileKey.get(fileMeta.fileKey);
		if (!pages) {
			throw new Error(`Imported pages are missing: ${fileMeta.fileKey}`);
		}
		return pages;
	});
	const importedPageIds = importedPages.map((page) => page.id);
	const pageIdsToClear = [...new Set(relationOwnerPageIds)];
	const annotationPositionByPageId = new Map(
		importedPages.map((page, position) => [page.id, position]),
	);
	const segmentRows = await db
		.selectFrom("segments")
		.select([
			"id",
			"tipitakaPageId as pageId",
			"number",
			"sourceBookCode",
			"sourceChapterNumber",
			"sourceParagraphNumber",
			"sourceParagraphOccurrence",
		])
		.where("tipitakaPageId", "in", importedPageIds)
		.orderBy("tipitakaPageId")
		.orderBy("number")
		.execute();
	const segmentsByPageId = new Map<number, LocatedSegment[]>();
	const pageIdBySegmentId = new Map<number, number>();
	for (const segmentRow of segmentRows) {
		const pageSegments = segmentsByPageId.get(segmentRow.pageId) ?? [];
		pageSegments.push(segmentRow);
		segmentsByPageId.set(segmentRow.pageId, pageSegments);
		pageIdBySegmentId.set(segmentRow.id, segmentRow.pageId);
	}

	const pageTargetsByKey = new Map<
		string,
		{ annotationPageId: number; targetPageId: number; position: number }
	>();
	const segmentLinks: Array<{
		targetSegmentId: number;
		annotationSegmentId: number;
	}> = [];
	let matchedParagraphGroupCount = 0;
	let unmatchedParagraphGroupCount = 0;
	for (const fileMeta of fileMetas) {
		if (fileMeta.annotationTargetFileKeys.length === 0) continue;
		const annotationPages = pagesByFileKey.get(fileMeta.fileKey);
		if (!annotationPages) {
			throw new Error(`Imported pages are missing: ${fileMeta.fileKey}`);
		}

		for (const annotationPage of annotationPages) {
			const annotationSegments = segmentsByPageId.get(annotationPage.id) ?? [];
			// Split page titles are generated navigation labels, not source prefaces.
			const linkableAnnotationSegments =
				annotationPages.length === 1
					? annotationSegments
					: annotationSegments.filter((segment) => segment.number !== 0);
			const targetPagesByLevel = new Map<
				TipitakaTextLevel,
				AnnotationTargetPage[]
			>();
			let targetPosition = 0;
			for (const targetFileKey of fileMeta.annotationTargetFileKeys) {
				const targetMeta = metaByFileKey.get(targetFileKey);
				const importedTargetPages = pagesByFileKey.get(targetFileKey);
				if (!targetMeta || !importedTargetPages) {
					throw new Error(
						`Annotation target metadata is missing: ${fileMeta.fileKey} -> ${targetFileKey}`,
					);
				}
				const targetPages = targetPagesByLevel.get(targetMeta.textLevel) ?? [];
				for (const targetPage of importedTargetPages) {
					targetPages.push({
						id: targetPage.id,
						position: targetPosition,
						textLevel: targetMeta.textLevel,
						segments: segmentsByPageId.get(targetPage.id) ?? [],
					});
					targetPosition += 1;
				}
				targetPagesByLevel.set(targetMeta.textLevel, targetPages);
			}

			for (const targetPages of targetPagesByLevel.values()) {
				const resolved = resolveAnnotationLinks(
					linkableAnnotationSegments,
					targetPages,
				);
				segmentLinks.push(...resolved.links);
				matchedParagraphGroupCount += resolved.matchedParagraphGroups;
				unmatchedParagraphGroupCount += resolved.unmatchedParagraphGroups;
				for (const link of resolved.links) {
					const targetPageId = pageIdBySegmentId.get(link.targetSegmentId);
					if (targetPageId === undefined) {
						throw new Error(
							`Resolved target segment has no imported page: ${link.targetSegmentId}`,
						);
					}
					const key = `${annotationPage.id}:${targetPageId}`;
					pageTargetsByKey.set(key, {
						annotationPageId: annotationPage.id,
						targetPageId,
						position: annotationPositionByPageId.get(annotationPage.id) ?? 0,
					});
				}
			}
		}
	}
	const pageTargets = [...pageTargetsByKey.values()];

	await db.transaction().execute(async (tx) => {
		await tx
			.deleteFrom("tipitakaPageAnnotationTargets")
			.where("annotationPageId", "in", pageIdsToClear)
			.execute();
		for (const pageTargetChunk of chunks(pageTargets, INSERT_CHUNK_SIZE)) {
			if (pageTargetChunk.length === 0) continue;
			await tx
				.insertInto("tipitakaPageAnnotationTargets")
				.values(pageTargetChunk)
				.execute();
		}

		await tx
			.deleteFrom("segmentAnnotationLinks")
			.where(
				"annotationSegmentId",
				"in",
				tx
					.selectFrom("segments")
					.select("id")
					.where("tipitakaPageId", "in", pageIdsToClear),
			)
			.execute();
		for (const segmentLinkChunk of chunks(segmentLinks, INSERT_CHUNK_SIZE)) {
			if (segmentLinkChunk.length === 0) continue;
			await tx
				.insertInto("segmentAnnotationLinks")
				.values(segmentLinkChunk)
				.onConflict((conflict) => conflict.doNothing())
				.execute();
		}
	});

	if (unmatchedParagraphGroupCount > 0) {
		logger.warn(
			"Some annotation paragraph groups have no official target anchor",
			{
				matchedParagraphGroupCount,
				unmatchedParagraphGroupCount,
			},
		);
	}

	return {
		pageTargetCount: pageTargets.length,
		segmentLinkCount: segmentLinks.length,
		matchedParagraphGroupCount,
		unmatchedParagraphGroupCount,
	};
}
