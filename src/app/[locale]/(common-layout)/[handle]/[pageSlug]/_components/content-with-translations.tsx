"use client";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import useSWR from "swr";

import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import type { PageDetail } from "@/app/[locale]/types";
import { getPageAnnotationsData } from "@/routes/$locale/-page-annotations-data";

import type { NavigationData } from "../_db/queries";
import { extractTocItems } from "../_domain/extract-toc-items";
import { mdastToReact } from "./mdast-to-react";
import { PageNavigation } from "./page-navigation";
import { usePageSegmentGlosses } from "./segment-glosses/use-page-segment-glosses";
import { SegmentGlossVoteProvider } from "./segment-glosses/vote-context";

interface ContentWithTranslationsProps {
	pageDetail: PageDetail;
	locale: string;
	navigationData: NavigationData | null;
}

type PageAnnotationsData = Awaited<ReturnType<typeof getPageAnnotationsData>>;
type GlossUnitsData = ReturnType<typeof usePageSegmentGlosses>["data"];

type DisplayEntry = {
	annotations: PageAnnotationsData | undefined;
	glossUnits: GlossUnitsData;
	displayPageDetail: PageDetail;
	content: ReturnType<typeof mdastToReact>;
};

// 入力（pageDetail + annotations + glossUnits）ごとに描画済み要素をキャッシュする
const displayEntries = new WeakMap<PageDetail, DisplayEntry>();

function buildDisplayPageDetail(
	pageDetail: PageDetail,
	annotations: PageAnnotationsData | undefined,
	glossUnits: GlossUnitsData,
): PageDetail {
	if (!annotations && !glossUnits) return pageDetail;
	const glossUnitsBySegment = new Map<number, NonNullable<GlossUnitsData>>();
	for (const unit of glossUnits ?? []) {
		const segmentGlossUnits = glossUnitsBySegment.get(unit.segmentId) ?? [];
		segmentGlossUnits.push(unit);
		glossUnitsBySegment.set(unit.segmentId, segmentGlossUnits);
	}
	return {
		...pageDetail,
		segments: pageDetail.segments.map((segment) => ({
			...segment,
			annotations: annotations?.[String(segment.id)] ?? segment.annotations,
			glossUnits: glossUnitsBySegment.get(segment.id) ?? [],
		})),
	};
}

function getDisplayEntry(
	pageDetail: PageDetail,
	annotations: PageAnnotationsData | undefined,
	glossUnits: GlossUnitsData,
): DisplayEntry {
	const cached = displayEntries.get(pageDetail);
	if (
		cached &&
		cached.annotations === annotations &&
		cached.glossUnits === glossUnits
	) {
		return cached;
	}
	const displayPageDetail = buildDisplayPageDetail(
		pageDetail,
		annotations,
		glossUnits,
	);
	const entry: DisplayEntry = {
		annotations,
		glossUnits,
		displayPageDetail,
		content: mdastToReact({
			mdast: displayPageDetail.mdastJson,
			segments: displayPageDetail.segments,
		}),
	};
	displayEntries.set(pageDetail, entry);
	return entry;
}

export function ContentWithTranslations({
	pageDetail,
	locale,
	navigationData,
}: ContentWithTranslationsProps) {
	const [visibleAnnotations] = useQueryState(
		"annotations",
		parseAsArrayOf(parseAsString, "~").withDefault([]),
	);
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
	);
	const { displayPageDetail, content } = getDisplayEntry(
		pageDetail,
		annotations,
		glossUnits,
	);
	const tocItems = extractTocItems({
		mdast: displayPageDetail.mdastJson,
		segments: displayPageDetail.segments,
	});

	const titleSegment = displayPageDetail.segments.find(
		(segment) => segment.number === 0,
	);

	const markdown = mdastToMarkdown(displayPageDetail.mdastJson);
	if (!titleSegment) return null;
	return (
		<SegmentGlossVoteProvider locale={locale} mutate={mutateGlossUnits}>
			<PageNavigation
				data={navigationData}
				locale={locale}
				markdown={markdown}
				pageId={displayPageDetail.id}
				slug={displayPageDetail.slug}
				title={displayPageDetail.title}
				tocItems={tocItems}
			/>
			<h1 className="mb-0!">
				<SegmentElement segment={titleSegment} />
			</h1>
			<div className="js-content">{content}</div>
		</SegmentGlossVoteProvider>
	);
}
