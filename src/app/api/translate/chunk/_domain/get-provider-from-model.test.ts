import { describe, expect, it } from "vite-plus/test";
import { getProviderFromModel } from "./get-provider-from-model";

describe("getProviderFromModel", () => {
	it("Geminiモデルのとき、Gemini APIを選ぶ", () => {
		expect(getProviderFromModel("gemini-3.1-flash-lite")).toBe("gemini");
	});

	it("OpenAIモデルのとき、openaiを選ぶ", () => {
		expect(getProviderFromModel("gpt-5-nano-2025-08-07")).toBe("openai");
	});

	it("DeepSeekモデルのとき、deepseekを選ぶ", () => {
		expect(getProviderFromModel("deepseek-reasoner")).toBe("deepseek");
	});

	it("不明なモデルのとき、Gemini APIを選ぶ", () => {
		expect(getProviderFromModel("unknown-model")).toBe("gemini");
	});
});
