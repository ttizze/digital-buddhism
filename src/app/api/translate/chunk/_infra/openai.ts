import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { createServerLogger } from "@/app/_service/logger.server";
import { generateTranslationPrompt } from "./generate-translation-prompt";

const logger = createServerLogger("openai-translation");

// 翻訳結果のスキーマ（OpenAI APIはrootがobjectである必要がある）
const translationSchema = z.object({
	translations: z.array(
		z.object({
			number: z.number(),
			text: z.string(),
		}),
	),
});

export async function getOpenAIModelResponse({
	apiKey,
	model,
	title,
	sourceText,
	targetLocale,
	translationContext,
}: {
	apiKey: string;
	model: string;
	title: string;
	sourceText: string;
	targetLocale: string;
	translationContext: string;
}) {
	// 入力JSON行数をカウント
	const inputLineCount = sourceText.split("\n").length;

	const openai = createOpenAI({
		apiKey,
	});

	try {
		const { object } = await generateObject({
			model: openai(model),
			maxRetries: 0,
			schema: translationSchema,
			schemaName: "TranslationResponse",
			schemaDescription:
				"Array of translated text segments with their original numbers",
			prompt: generateTranslationPrompt(
				title,
				sourceText,
				targetLocale,
				translationContext,
			),
		});

		if (!object?.translations || object.translations.length === 0) {
			throw new Error("Empty response from OpenAI");
		}

		return JSON.stringify(object.translations);
	} catch (error: unknown) {
		const typedError = error as Error;
		logger.error(
			{
				input_count: inputLineCount,
				error_name: typedError.name,
				error_message: typedError.message,
			},
			"OpenAI translation failed",
		);
		throw typedError;
	}
}
