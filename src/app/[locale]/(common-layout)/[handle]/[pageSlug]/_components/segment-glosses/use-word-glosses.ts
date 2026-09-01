"use client";

import useSWR from "swr";
import {
	type WordGloss,
	wordGlossSchema,
} from "@/app/api/segment-glosses/_domain/word-glosses";

async function fetchWordGlosses([_url, wordId, locale]: readonly [
	string,
	number,
	string,
]): Promise<WordGloss[]> {
	const searchParams = new URLSearchParams({
		wordId: String(wordId),
		locale,
	});
	const response = await fetch(`/api/segment-glosses?${searchParams}`, {
		credentials: "same-origin",
		cache: "no-store",
	});
	if (!response.ok) throw new Error("Failed to load word glosses");
	return wordGlossSchema.array().parse(await response.json());
}

export function useWordGlosses(
	wordId: number,
	locale: string,
	enabled: boolean,
) {
	return useSWR(
		enabled ? (["/api/segment-glosses/word", wordId, locale] as const) : null,
		fetchWordGlosses,
		{ revalidateOnFocus: false },
	);
}
