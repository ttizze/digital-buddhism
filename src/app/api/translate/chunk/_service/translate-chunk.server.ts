import { createServerLogger } from "@/app/_service/logger.server";
import type { SegmentElement } from "../../types";
import {
	ensurePageLocaleTranslationProof,
	getOrCreateAIUser,
	getTranslatedSegmentIds,
} from "../_db/mutations.server";
import { extractTranslations } from "../_domain/extract-translations";
import { getTranslatedText } from "./get-translated-text.server";
import { saveTranslations } from "./save-translations.server";

const logger = createServerLogger("translate-chunk");

export async function translateChunk(
	aiModel: string,
	segments: SegmentElement[],
	targetLocale: string,
	pageId: number,
	title: string,
	translationContext: string,
) {
	const aiUserId = await getOrCreateAIUser(aiModel);
	const translatedSegmentIds = await getTranslatedSegmentIds(
		segments.map((segment) => segment.id),
		targetLocale,
		aiUserId,
	);
	const pendingSegments = segments.filter(
		(segment) => !translatedSegmentIds.has(segment.id),
	);
	if (pendingSegments.length === 0) return aiUserId;

	const translatedText = await getTranslatedText(
		aiModel,
		pendingSegments,
		targetLocale,
		title,
		translationContext,
	);
	const partialTranslations = extractTranslations(translatedText);

	if (partialTranslations.length > 0) {
		await saveTranslations(
			partialTranslations,
			pendingSegments,
			targetLocale,
			aiUserId,
		);
		await ensurePageLocaleTranslationProof(pageId, targetLocale);
	}

	const translatedNumbers = new Set(
		partialTranslations.map((translation) => translation.number),
	);
	const remainingCount = pendingSegments.filter(
		(segment) => !translatedNumbers.has(segment.number),
	).length;
	if (remainingCount > 0) {
		logger.error(
			{ pending_count: remainingCount },
			"一部要素は翻訳できませんでした",
		);
		throw new Error(
			"部分的な翻訳のみ完了し、残存要素はQueue再試行の対象です。",
		);
	}

	return aiUserId;
}
