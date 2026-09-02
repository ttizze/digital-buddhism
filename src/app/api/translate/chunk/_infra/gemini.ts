import {
	GoogleGenAI,
	HarmBlockThreshold,
	HarmCategory,
	ThinkingLevel,
} from "@google/genai";
import { generateTranslationPrompt } from "./generate-translation-prompt";
import type { TranslationModelRequest } from "./translation-model-request";

const MAX_OUTPUT_TOKENS = 65536;
const HTTP_TIMEOUT_MS = 10 * 60 * 1000;

const safetySettings = [
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
	},
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
	},
	{
		category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
		threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
	},
	{
		category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
		threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
	},
];

export async function getGeminiModelResponse({
	apiKey,
	model,
	title,
	sourceText,
	targetLocale,
	translationContext,
}: TranslationModelRequest) {
	const gemini = new GoogleGenAI({ apiKey });
	const response = await gemini.models.generateContent({
		model,
		contents: generateTranslationPrompt(
			title,
			sourceText,
			targetLocale,
			translationContext,
		),
		config: {
			httpOptions: { timeout: HTTP_TIMEOUT_MS },
			responseMimeType: "application/json",
			responseJsonSchema: {
				type: "array",
				items: {
					type: "object",
					properties: {
						number: { type: "integer", minimum: 0 },
						text: { type: "string", minLength: 1 },
					},
					required: ["number", "text"],
				},
			},
			maxOutputTokens: MAX_OUTPUT_TOKENS,
			safetySettings,
			...(model === "gemini-3.1-pro-preview" || model === "gemini-3.7-flash"
				? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
				: {}),
		},
	});
	const jsonText = response.text?.trim() ?? "";
	if (!jsonText) {
		throw new Error("Empty response from Gemini API");
	}
	return jsonText;
}
