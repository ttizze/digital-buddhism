import useSWR from "swr";
import {
	type SegmentTranslation,
	segmentTranslationSchema,
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
	return segmentTranslationSchema.array().parse(await response.json());
}

export function useSegmentTranslations({
	segmentId,
	userLocale,
	enabled,
}: UseSegmentTranslationsParams) {
	const key = enabled
		? `/api/segment-translations?segmentId=${segmentId}&userLocale=${userLocale}`
		: null;

	const { data, error, isLoading, mutate } = useSWR<SegmentTranslation[]>(
		key,
		fetchSegmentTranslations,
	);

	return { data, error, isLoading, mutate };
}
