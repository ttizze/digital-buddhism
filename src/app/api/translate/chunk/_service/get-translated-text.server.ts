import { env } from "cloudflare:workers";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { createServerLogger } from "@/app/_service/logger.server";
import type { SegmentElement } from "../../types";
import { getProviderFromModel } from "../_domain/get-provider-from-model";
import { getDeepSeekModelResponse } from "../_infra/deepseek";
import { getGeminiModelResponse } from "../_infra/gemini";
import { getOpenAIModelResponse } from "../_infra/openai";

const logger = createServerLogger("translate-chunk");

export async function getTranslatedText(
	aiModel: string,
	segments: SegmentElement[],
	targetLocale: string,
	title: string,
	translationContext: string,
) {
	// AIに送るのは number と text のペアのみ（id は不要）
	const sourceText = segments
		.map((seg) => JSON.stringify({ number: seg.number, text: seg.text }))
		.join("\n");
	const targetLocaleName =
		supportedLocaleOptions.find((sl) => sl.code === targetLocale)?.name ||
		targetLocale;

	// モデル名からproviderを判定
	const provider = getProviderFromModel(aiModel);

	if (provider === "openai") {
		const openaiApiKey = env.OPENAI_API_KEY;
		if (!openaiApiKey) {
			throw new Error(
				"OPENAI_API_KEY environment variable is not set. Page will not be translated.",
			);
		}
		return await getOpenAIModelResponse({
			apiKey: openaiApiKey,
			model: aiModel,
			title,
			sourceText,
			targetLocale: targetLocaleName,
			translationContext,
		});
	}

	if (provider === "deepseek") {
		const deepseekApiKey = env.DEEPSEEK_API_KEY;
		if (!deepseekApiKey) {
			logger.error("DEEPSEEK_API_KEY not found in environment");
			throw new Error(
				"DEEPSEEK_API_KEY environment variable is not set. Page will not be translated.",
			);
		}
		return await getDeepSeekModelResponse({
			apiKey: deepseekApiKey,
			model: aiModel,
			title,
			sourceText,
			targetLocale: targetLocaleName,
			translationContext,
		});
	}

	const geminiApiKey = env.GEMINI_API_KEY;
	if (!geminiApiKey) {
		throw new Error(
			"GEMINI_API_KEY environment variable is not set. Page will not be translated.",
		);
	}
	return await getGeminiModelResponse({
		apiKey: geminiApiKey,
		model: aiModel,
		title,
		sourceText,
		targetLocale: targetLocaleName,
		translationContext,
	});
}
