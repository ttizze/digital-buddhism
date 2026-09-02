import { env } from "cloudflare:workers";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { createServerLogger } from "@/app/_service/logger.server";
import type { SegmentElement } from "../../types";
import { getProviderFromModel } from "../_domain/get-provider-from-model";
import {
	getDeepSeekModelResponse,
	getOpenAIModelResponse,
} from "../_infra/ai-sdk";
import { getGeminiModelResponse } from "../_infra/gemini";

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
	const request = {
		model: aiModel,
		title,
		sourceText,
		targetLocale: targetLocaleName,
		translationContext,
	};

	if (provider === "openai") {
		const openaiApiKey = env.OPENAI_API_KEY;
		if (!openaiApiKey) {
			throw new Error(
				"OPENAI_API_KEY environment variable is not set. Page will not be translated.",
			);
		}
		return await getOpenAIModelResponse({
			...request,
			apiKey: openaiApiKey,
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
			...request,
			apiKey: deepseekApiKey,
		});
	}

	const geminiApiKey = env.GEMINI_API_KEY;
	if (!geminiApiKey) {
		throw new Error(
			"GEMINI_API_KEY environment variable is not set. Page will not be translated.",
		);
	}
	return await getGeminiModelResponse({
		...request,
		apiKey: geminiApiKey,
	});
}
