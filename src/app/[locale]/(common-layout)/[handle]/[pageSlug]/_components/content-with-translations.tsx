import useSWR from "swr";

import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { getPageAnnotationsData } from "@/routes/$locale/-page-annotations-data";

import { pageDetailRoute } from "@/app/[locale]/(common-layout)/_components/page-detail-route-api";
import type { NavigationData } from "../_db/queries";
import { extractTocItems } from "../_domain/extract-toc-items";
import {
	materializeContentViewSegment,
	type PageContentBody,
	type PageDetailView,
} from "../_domain/page-content-view";
import { contentViewToReact } from "./content-view";
import { PageNavigation } from "./page-navigation";
import { usePageSegmentGlosses } from "./segment-glosses/use-page-segment-glosses";
import { SegmentGlossVoteProvider } from "./segment-glosses/vote-context";

interface ContentWithTranslationsProps {
	body: PageContentBody;
	pageDetail: PageDetailView;
	locale: string;
	navigationData: NavigationData | null;
}

export function ContentWithTranslations({
	body,
	pageDetail,
	locale,
	navigationData,
}: ContentWithTranslationsProps) {
	const [titleSegmentData, nodes] = body;
	const visibleAnnotations = pageDetailRoute.useSearch({
		select: (search) => search.annotations,
	});
	const { data: annotations } = useSWR(
		visibleAnnotations.length > 0
			? ["page-annotations", pageDetail.slug, locale]
			: null,
		() =>
			getPageAnnotationsData({
				data: { locale, pageSlug: pageDetail.slug },
			}),
		{ revalidateOnFocus: false },
	);
	const { data: glossUnits, mutate: mutateGlossUnits } = usePageSegmentGlosses(
		pageDetail.id,
		locale,
		body,
	);
	const glossUnitsBySegment = new Map<number, NonNullable<typeof glossUnits>>();
	for (const unit of glossUnits ?? []) {
		const segmentGlossUnits = glossUnitsBySegment.get(unit.segmentId) ?? [];
		segmentGlossUnits.push(unit);
		glossUnitsBySegment.set(unit.segmentId, segmentGlossUnits);
	}
	const content = contentViewToReact({
		nodes,
		pageId: pageDetail.id,
		annotations: annotations ?? undefined,
		glossUnitsBySegment,
	});
	const tocItems = extractTocItems({
		nodes,
		pageId: pageDetail.id,
	});
	if (!titleSegmentData) return null;
	const titleSegment = materializeContentViewSegment(
		titleSegmentData,
		pageDetail.id,
		"",
		annotations?.[String(titleSegmentData[0])],
		glossUnitsBySegment.get(titleSegmentData[0]),
	);
	return (
		<SegmentGlossVoteProvider locale={locale} mutate={mutateGlossUnits}>
			<PageNavigation
				data={navigationData}
				locale={locale}
				pageId={pageDetail.id}
				slug={pageDetail.slug}
				title={pageDetail.title}
				tocItems={tocItems}
			/>
			<h1 className="mb-0!">
				<SegmentElement segment={titleSegment} />
			</h1>
			<div className="js-content">{content}</div>
		</SegmentGlossVoteProvider>
	);
}
