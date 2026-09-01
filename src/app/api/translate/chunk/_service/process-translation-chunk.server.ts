import { getPageSegments } from "../../_db/queries.server";
import type { TranslateChunkParams } from "../../types";
import {
	getTranslatedSegmentIds,
	setTranslationProgress,
} from "../_db/mutations.server";
import { translateChunk } from "./translate-chunk.server";

export async function processTranslationChunk(params: TranslateChunkParams) {
	const aiUserId = await translateChunk(
		params.userId,
		params.aiModel,
		params.segments,
		params.targetLocale,
		params.pageId,
		params.title,
		params.translationContext,
	);

	const targetPageId = params.annotationPageId ?? params.pageId;
	const pageSegments = await getPageSegments(targetPageId);
	const translatedSegmentIds = await getTranslatedSegmentIds(
		pageSegments.map((segment) => segment.id),
		params.targetLocale,
		aiUserId,
	);
	const updated = await setTranslationProgress(
		params.translationJobId,
		translatedSegmentIds.size,
		pageSegments.length,
	);

	return {
		completedPageId:
			updated?.status === "COMPLETED" ? params.pageId : undefined,
	};
}
