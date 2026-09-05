import useSWR from "swr";
import {
	parseSegmentGlossVotes,
	type SegmentGlossUnit,
} from "@/app/api/segment-glosses/_domain/segment-glosses";
import { authClient } from "@/app/[locale]/_service/auth-client";
import type {
	PageContentBody,
	ContentViewNode,
} from "../../_domain/page-content-view";

function collectGlossUnits(
	nodes: ContentViewNode[],
	units: SegmentGlossUnit[],
): void {
	for (const node of nodes) {
		if (!Array.isArray(node)) continue;
		if (node[2]?.[6]) units.push(...node[2][6]);
		collectGlossUnits(node[1], units);
	}
}

export function usePageSegmentGlosses(
	pageId: number,
	locale: string,
	body: PageContentBody,
) {
	const { data: session } = authClient.useSession();
	const initialUnits = [...(body[0]?.[6] ?? [])];
	collectGlossUnits(body[1], initialUnits);
	return useSWR<SegmentGlossUnit[]>(
		session?.user && initialUnits.length > 0
			? ["/api/segment-glosses", pageId, locale, session.user.id]
			: null,
		async () => {
			const searchParams = new URLSearchParams({
				pageId: String(pageId),
				locale,
			});
			const response = await fetch(`/api/segment-glosses?${searchParams}`, {
				credentials: "same-origin",
			});
			if (!response.ok) throw new Error("Failed to load segment gloss votes");
			const votes = new Map(
				parseSegmentGlossVotes(await response.json()).map((vote) => [
					vote.id,
					vote,
				]),
			);
			return initialUnits.map((unit) => ({ ...unit, ...votes.get(unit.id) }));
		},
		{ fallbackData: initialUnits, revalidateOnFocus: false },
	);
}
