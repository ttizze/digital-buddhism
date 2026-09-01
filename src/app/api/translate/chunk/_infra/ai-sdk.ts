import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { createServerLogger } from "@/app/_service/logger.server";
import { generateTranslationPrompt } from "./generate-translation-prompt";

const logger = createServerLogger("ai-sdk-translation");

const translationElementSchema = z.object({
	number: z.number(),
	text: z.string(),
});

// OpenAI APIはrootがobjectである必要がある
const objectTranslationSchema = z.object({
	translations: z.array(translationElementSchema),
});
// DeepSeekは配列を直接返す
const arrayTranslationSchema = z.array(translationElementSchema);

export interface AiSdkModelRequestParams {
	apiKey: string;
	model: string;
	title: string;
	sourceText: string;
	targetLocale: string;
	translationContext: string;
}

export function getOpenAIModelResponse(params: AiSdkModelRequestParams) {
	const openai = createOpenAI({ apiKey: params.apiKey });
	return generateTranslationResponse({
		params,
		model: openai(params.model),
		provider: "OpenAI",
		schema: objectTranslationSchema,
		unwrap: (object) => object.translations,
	});
}

export function getDeepSeekModelResponse(params: AiSdkModelRequestParams) {
	const deepseek = createDeepSeek({ apiKey: params.apiKey });
	return generateTranslationResponse({
		params,
		model: deepseek(params.model),
		provider: "DeepSeek",
		schema: arrayTranslationSchema,
		unwrap: (object) => object,
	});
}

async function generateTranslationResponse<T>({
	params,
	model,
	provider,
	schema,
	unwrap,
}: {
	params: AiSdkModelRequestParams;
	model: LanguageModel;
	provider: string;
	schema: z.ZodType<T>;
	unwrap: (object: T) => z.infer<typeof arrayTranslationSchema>;
}) {
	// 入力JSON行数をカウント
	const inputLineCount = params.sourceText.split("\n").length;

	try {
		const { object } = await generateObject({
			model,
			maxRetries: 0,
			schema,
			schemaName: "TranslationResponse",
			schemaDescription:
				"Array of translated text segments with their original numbers",
			prompt: generateTranslationPrompt(
				params.title,
				params.sourceText,
				params.targetLocale,
				params.translationContext,
			),
		});

		const translations = object ? unwrap(object) : [];
		if (translations.length === 0) {
			throw new Error(`Empty response from ${provider}`);
		}

		return JSON.stringify(translations);
	} catch (error: unknown) {
		const typedError = error as Error;
		logger.error(
			{
				provider,
				input_count: inputLineCount,
				error_name: typedError.name,
				error_message: typedError.message,
				error_stack: typedError.stack,
			},
			`${provider} translation failed`,
		);
		throw typedError;
	}
}
