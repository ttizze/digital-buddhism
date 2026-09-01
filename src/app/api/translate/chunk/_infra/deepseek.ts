import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import { createServerLogger } from "@/app/_service/logger.server";
import { generateTranslationPrompt } from "./generate-translation-prompt";

const logger = createServerLogger("deepseek-translation");

// 翻訳結果のスキーマ（DeepSeekは配列を直接返す）
const translationSchema = z.array(
	z.object({
		number: z.number(),
		text: z.string(),
	}),
);

export async function getDeepSeekModelResponse({
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

	const deepseek = createDeepSeek({
		apiKey,
	});

	try {
		const result = await generateObject({
			model: deepseek(model),
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

		if (!result.object || result.object.length === 0) {
			throw new Error("Empty response from DeepSeek");
		}

		return JSON.stringify(result.object);
	} catch (error: unknown) {
		const typedError = error as Error;
		logger.error(
			{
				input_count: inputLineCount,
				error_name: typedError.name,
				error_message: typedError.message,
				error_stack: typedError.stack,
			},
			"DeepSeek translation failed",
		);
		throw typedError;
	}
}
