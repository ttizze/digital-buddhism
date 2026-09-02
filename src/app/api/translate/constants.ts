const MAX_CHUNK_SIZE = 10000;

// モデルごとの最大チャンクサイズ（文字数）
// Current Gemini models: 出力65,536トークン上限 → 30,000文字
const MODEL_MAX_CHUNK_SIZES = new Map([
	// OpenAI GPT-5 models
	["gpt-5-nano-2025-08-07", 30000],
	// DeepSeek models
	["deepseek-reasoner", 30000],
	["deepseek-chat", 30000],
	// Current Gemini models
	["gemini-3.7-flash", 30000],
	["gemini-3.1-pro-preview", 30000],
	["gemini-3.1-flash-lite", 30000],
]);

export function getMaxChunkSizeForModel(model: string): number {
	return MODEL_MAX_CHUNK_SIZES.get(model) ?? MAX_CHUNK_SIZE;
}
