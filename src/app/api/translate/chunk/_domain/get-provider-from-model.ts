type TranslationProvider = "gemini" | "openai" | "deepseek";

export function getProviderFromModel(aiModel: string): TranslationProvider {
	if (aiModel.startsWith("gpt-")) {
		return "openai";
	}
	if (aiModel.startsWith("deepseek-")) {
		return "deepseek";
	}
	if (aiModel.startsWith("gemini-")) {
		return "gemini";
	}
	return "gemini";
}
