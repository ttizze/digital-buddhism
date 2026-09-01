"use client";

import useSWR from "swr";
import { segmentWordWithGlossSchema } from "@/app/api/segment-glosses/_domain/word-glosses";

async function fetchPageWordGlosses([_url, pageId, locale]: readonly [
	string,
	number,
	string,
]) {
	const searchParams = new URLSearchParams({
		pageId: String(pageId),
		locale,
	});
	const response = await fetch(`/api/segment-glosses?${searchParams}`, {
		credentials: "same-origin",
	});
	if (!response.ok) throw new Error("Failed to load word glosses");
	return segmentWordWithGlossSchema.array().parse(await response.json());
}

export function usePageWordGlosses(pageId: number, locale: string) {
	return useSWR(
		["/api/segment-glosses", pageId, locale] as const,
		fetchPageWordGlosses,
		{ revalidateOnFocus: false },
	);
}
