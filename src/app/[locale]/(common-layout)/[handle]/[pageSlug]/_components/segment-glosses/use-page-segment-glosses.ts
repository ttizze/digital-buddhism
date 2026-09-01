"use client";

import useSWR from "swr";
import { parseSegmentGlossUnits } from "@/app/api/segment-glosses/_domain/segment-glosses";

async function fetchPageSegmentGlosses([_url, pageId, locale]: readonly [
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
	if (!response.ok) throw new Error("Failed to load segment glosses");
	return parseSegmentGlossUnits(await response.json());
}

export function usePageSegmentGlosses(pageId: number, locale: string) {
	return useSWR(
		["/api/segment-glosses", pageId, locale] as const,
		fetchPageSegmentGlosses,
		{ revalidateOnFocus: false },
	);
}
