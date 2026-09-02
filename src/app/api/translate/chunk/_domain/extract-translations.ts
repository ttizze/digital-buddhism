import { createServerLogger } from "@/app/_service/logger.server";
import * as v from "valibot";
import type { TranslatedElement } from "../../types";

const logger = createServerLogger("extract-translations");
const translationsSchema = v.array(
	v.object({ number: v.number(), text: v.string() }),
);

const parseJsonTranslations = (text: string): TranslatedElement[] | null => {
	const parsed = v.safeParse(translationsSchema, JSON.parse(text));
	return parsed.success ? parsed.output : null;
};

const decodeJsonString = (raw: string) => {
	try {
		const parsed = v.safeParse(v.string(), JSON.parse(`"${raw}"`));
		return parsed.success ? parsed.output : raw;
	} catch {
		return raw;
	}
};

export function extractTranslations(text: string): TranslatedElement[] {
	try {
		const parsed = parseJsonTranslations(text);
		if (parsed) return parsed;
		throw new SyntaxError("Parsed JSON is not a valid translation array");
	} catch (error) {
		logger.warn("Failed to parse as JSON, falling back to regex parsing", {
			error_message: error instanceof Error ? error.message : String(error),
			input_length: text.length,
			input_preview: text.slice(0, 300),
			input_end: text.slice(-300),
		});
	}

	const translations: TranslatedElement[] = [];
	const regex =
		/{\s*"number"\s*:\s*(\d+)\s*,\s*"text"\s*:\s*"((?:\\.|[^"\\])*)"\s*}/g;
	let match = regex.exec(text);
	while (match !== null) {
		const numberText = match[1];
		const raw = match[2];
		if (!numberText || raw === undefined) continue;
		const number = Number.parseInt(numberText, 10);
		const decoded = decodeJsonString(raw);
		translations.push({ number, text: decoded });
		match = regex.exec(text);
	}

	logger.debug("Regex fallback extraction completed", {
		extracted_count: translations.length,
	});

	return translations;
}
