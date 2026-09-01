import useSWR from "swr";
import {
	parseSegmentTranslations,
	type SegmentTranslation,
} from "@/app/api/segment-translations/_domain/segment-translations";

interface UseSegmentTranslationsParams {
	segmentId: number;
	userLocale: string;
	enabled: boolean;
}

async function fetchSegmentTranslations(
	url: string,
): Promise<SegmentTranslation[]> {
	const response = await fetch(url, { cache: "no-store" });
	if (!response.ok) {
		throw new Error("Failed to fetch translations");
	}
	return parseSegmentTranslations(await response.json());
}

export function useSegmentTranslations({
	segmentId,
	userLocale,
	enabled,
}: UseSegmentTranslationsParams) {
	const key = enabled
		? `/api/segment-translations?segmentId=${segmentId}&userLocale=${userLocale}`
		: null;

	return useSWR<SegmentTranslation[]>(key, fetchSegmentTranslations);
}
