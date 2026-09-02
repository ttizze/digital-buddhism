import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { generateContentMock } = vi.hoisted(() => ({
	generateContentMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
	GoogleGenAI: class {
		models = { generateContent: generateContentMock };
	},
	HarmBlockThreshold: { BLOCK_ONLY_HIGH: "BLOCK_ONLY_HIGH" },
	HarmCategory: {
		HARM_CATEGORY_HARASSMENT: "HARASSMENT",
		HARM_CATEGORY_HATE_SPEECH: "HATE_SPEECH",
		HARM_CATEGORY_SEXUALLY_EXPLICIT: "SEXUALLY_EXPLICIT",
		HARM_CATEGORY_DANGEROUS_CONTENT: "DANGEROUS_CONTENT",
	},
	ThinkingLevel: { LOW: "LOW" },
}));

import { getGeminiModelResponse } from "./gemini";

describe("getGeminiModelResponse", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		generateContentMock.mockResolvedValue({ text: "[]" });
	});

	it("Gemini 3.1 ProはLOW thinkingと10分のHTTP timeoutで実行する", async () => {
		await getGeminiModelResponse({
			apiKey: "test-key",
			model: "gemini-3.1-pro-preview",
			title: "Test",
			sourceText: '{"number":0,"text":"Dhamma"}',
			targetLocale: "Japanese",
			translationContext: "",
		});

		expect(generateContentMock).toHaveBeenCalledWith(
			expect.objectContaining({
				config: expect.objectContaining({
					httpOptions: { timeout: 600_000 },
					thinkingConfig: { thinkingLevel: "LOW" },
				}),
			}),
		);
	});

	it("Gemini 3.7 FlashはLOW thinkingと10分のHTTP timeoutで実行する", async () => {
		await getGeminiModelResponse({
			apiKey: "test-key",
			model: "gemini-3.7-flash",
			title: "Test",
			sourceText: '{"number":0,"text":"Dhamma"}',
			targetLocale: "Japanese",
			translationContext: "",
		});

		expect(generateContentMock).toHaveBeenCalledWith(
			expect.objectContaining({
				config: expect.objectContaining({
					httpOptions: { timeout: 600_000 },
					thinkingConfig: { thinkingLevel: "LOW" },
				}),
			}),
		);
	});
});
