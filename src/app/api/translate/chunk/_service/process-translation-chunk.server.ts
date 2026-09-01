import { getPageSegmentIds } from "../../_db/queries.server";
import type { TranslateChunkParams } from "../../types";
import {
	getTranslatedSegmentIds,
	setTranslationProgress,
} from "../_db/mutations.server";
import { translateChunk } from "./translate-chunk.server";

export async function processTranslationChunk(params: TranslateChunkParams) {
	const aiUserId = await translateChunk(
		params.aiModel,
		params.segments,
		params.targetLocale,
		params.pageId,
		params.title,
		params.translationContext,
	);

	const targetPageId = params.annotationPageId ?? params.pageId;
	const segmentIds = await getPageSegmentIds(targetPageId);
	const translatedSegmentIds = await getTranslatedSegmentIds(
		segmentIds,
		params.targetLocale,
		aiUserId,
	);
	await setTranslationProgress(
		params.translationJobId,
		translatedSegmentIds.size,
		segmentIds.length,
	);
}
