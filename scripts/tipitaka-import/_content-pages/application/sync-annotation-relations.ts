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

function chunks<T>(values: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let index = 0; index < values.length; index += size) {
		result.push(values.slice(index, index + size));
	}
	return result;
}

export async function syncAnnotationRelations(
	fileMetas: TipitakaFileMeta[],
	pageIdByFileKey: ReadonlyMap<string, number>,
): Promise<SyncAnnotationRelationsResult> {
	const metaByFileKey = new Map(
		fileMetas.map((fileMeta) => [fileMeta.fileKey, fileMeta]),
	);
	const pageTargets = fileMetas.flatMap((fileMeta) => {
		const annotationPageId = pageIdByFileKey.get(fileMeta.fileKey);
		if (annotationPageId === undefined) {
			throw new Error(`Imported page is missing: ${fileMeta.fileKey}`);
		}
		return fileMeta.annotationTargetFileKeys.map((targetFileKey, position) => {
			const targetPageId = pageIdByFileKey.get(targetFileKey);
			if (targetPageId === undefined) {
				throw new Error(
					`Annotation target page is missing: ${fileMeta.fileKey} -> ${targetFileKey}`,
				);
			}
			return { annotationPageId, targetPageId, position };
		});
	});
	const importedPageIds = [...pageIdByFileKey.values()];
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
	for (const segmentRow of segmentRows) {
		const pageSegments = segmentsByPageId.get(segmentRow.pageId) ?? [];
		pageSegments.push(segmentRow);
		segmentsByPageId.set(segmentRow.pageId, pageSegments);
	}

	const segmentLinks: Array<{
		targetSegmentId: number;
		annotationSegmentId: number;
	}> = [];
	let matchedParagraphGroupCount = 0;
	let unmatchedParagraphGroupCount = 0;
	for (const fileMeta of fileMetas) {
		if (fileMeta.annotationTargetFileKeys.length === 0) continue;
		const annotationPageId = pageIdByFileKey.get(fileMeta.fileKey) as number;
		const targetPagesByLevel = new Map<
			TipitakaTextLevel,
			AnnotationTargetPage[]
		>();
		for (const [
			position,
			targetFileKey,
		] of fileMeta.annotationTargetFileKeys.entries()) {
			const targetMeta = metaByFileKey.get(targetFileKey);
			const targetPageId = pageIdByFileKey.get(targetFileKey);
			if (!targetMeta || targetPageId === undefined) {
				throw new Error(
					`Annotation target metadata is missing: ${fileMeta.fileKey} -> ${targetFileKey}`,
				);
			}
			const targetPages = targetPagesByLevel.get(targetMeta.textLevel) ?? [];
			targetPages.push({
				id: targetPageId,
				position,
				textLevel: targetMeta.textLevel,
				segments: segmentsByPageId.get(targetPageId) ?? [],
			});
			targetPagesByLevel.set(targetMeta.textLevel, targetPages);
		}

		for (const targetPages of targetPagesByLevel.values()) {
			const resolved = resolveAnnotationLinks(
				segmentsByPageId.get(annotationPageId) ?? [],
				targetPages,
			);
			segmentLinks.push(...resolved.links);
			matchedParagraphGroupCount += resolved.matchedParagraphGroups;
			unmatchedParagraphGroupCount += resolved.unmatchedParagraphGroups;
		}
	}

	await db.transaction().execute(async (tx) => {
		await tx
			.deleteFrom("tipitakaPageAnnotationTargets")
			.where("annotationPageId", "in", importedPageIds)
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
					.where("tipitakaPageId", "in", importedPageIds),
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
			{
				matchedParagraphGroupCount,
				unmatchedParagraphGroupCount,
			},
			"Some annotation paragraph groups have no official target anchor",
		);
	}

	return {
		pageTargetCount: pageTargets.length,
		segmentLinkCount: segmentLinks.length,
		matchedParagraphGroupCount,
		unmatchedParagraphGroupCount,
	};
}
