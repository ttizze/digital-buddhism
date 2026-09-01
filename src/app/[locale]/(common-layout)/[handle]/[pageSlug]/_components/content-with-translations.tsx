"use client";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { use } from "react";
import useSWR from "swr";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageDetail } from "@/app/[locale]/types";
import { getPageAnnotationsData } from "@/routes/$locale/-page-annotations-data";
import { extractTocItems } from "../_domain/extract-toc-items";
import { mdastToReact } from "./mdast-to-react";
import { usePageSegmentGlosses } from "./segment-glosses/use-page-segment-glosses";
import { SegmentGlossVoteProvider } from "./segment-glosses/vote-context";
import { SubHeader } from "./sub-header";

interface ContentWithTranslationsProps {
	pageDetail: PageDetail;
	locale: string;
}

type PageAnnotationsData = Awaited<ReturnType<typeof getPageAnnotationsData>>;
type GlossUnitsData = ReturnType<typeof usePageSegmentGlosses>["data"];

type DisplayEntry = {
	annotations: PageAnnotationsData | undefined;
	glossUnits: GlossUnitsData;
	displayPageDetail: PageDetail;
	contentPromise: ReturnType<typeof mdastToReact>;
};

// use() へ渡す Promise は再レンダーで同一である必要があるため、
// 入力（pageDetail + annotations + glossUnits）ごとにモジュールレベルでキャッシュする
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
		contentPromise: mdastToReact({
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
	const { displayPageDetail, contentPromise } = getDisplayEntry(
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

	const content = use(contentPromise);
	const markdown = mdastToMarkdown(displayPageDetail.mdastJson);
	if (!titleSegment) return null;
	return (
		<SegmentGlossVoteProvider locale={locale} mutate={mutateGlossUnits}>
			<h1 className="mb-0! ">
				<SegmentElement segment={titleSegment} />
			</h1>
			<SubHeader
				markdown={markdown}
				pageDetail={displayPageDetail}
				tocItems={tocItems}
			/>
			<div className="js-content">{content}</div>
		</SegmentGlossVoteProvider>
	);
}
