import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { valibotSchema } from "@ai-sdk/valibot";
import { generateObject, type LanguageModel } from "ai";
import * as v from "valibot";
import { createServerLogger } from "@/app/_service/logger.server";
import { generateTranslationPrompt } from "./generate-translation-prompt";
import type { TranslationModelRequest } from "./translation-model-request";

const logger = createServerLogger("ai-sdk-translation");

const translationElementSchema = v.object({
	number: v.number(),
	text: v.string(),
});

// OpenAI APIはrootがobjectである必要がある
const objectTranslationSchema = v.object({
	translations: v.array(translationElementSchema),
});
// DeepSeekは配列を直接返す
const arrayTranslationSchema = v.array(translationElementSchema);
type TranslationElement = v.InferOutput<typeof translationElementSchema>;

export function getOpenAIModelResponse(params: TranslationModelRequest) {
	const openai = createOpenAI({ apiKey: params.apiKey });
	return generateTranslationResponse({
		params,
		model: openai(params.model),
		provider: "OpenAI",
		schema: objectTranslationSchema,
		unwrap: (object) => object.translations,
	});
}

export function getDeepSeekModelResponse(params: TranslationModelRequest) {
	const deepseek = createDeepSeek({ apiKey: params.apiKey });
	return generateTranslationResponse({
		params,
		model: deepseek(params.model),
		provider: "DeepSeek",
		schema: arrayTranslationSchema,
		unwrap: (object) => object,
	});
}

async function generateTranslationResponse<
	const TSchema extends v.GenericSchema,
>({
	params,
	model,
	provider,
	schema,
	unwrap,
}: {
	params: TranslationModelRequest;
	model: LanguageModel;
	provider: string;
	schema: TSchema;
	unwrap: (object: v.InferOutput<TSchema>) => TranslationElement[];
}) {
	// 入力JSON行数をカウント
	const inputLineCount = params.sourceText.split("\n").length;

	try {
		const generatedSchema = valibotSchema(schema);
		const { object } = await generateObject({
			model,
			maxRetries: 0,
			schema: generatedSchema,
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

		const translations = unwrap(object);
		if (translations.length === 0) {
			throw new Error(`Empty response from ${provider}`);
		}

		return JSON.stringify(translations);
	} catch (error) {
		const errorName = error instanceof Error ? error.name : "UnknownError";
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		logger.error(`${provider} translation failed`, {
			provider,
			input_count: inputLineCount,
			error_name: errorName,
			error_message: errorMessage,
			error_stack: errorStack,
		});
		throw error;
	}
}
