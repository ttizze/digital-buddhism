"use client";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { use, useMemo } from "react";
import useSWR from "swr";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageDetail } from "@/app/[locale]/types";
import { getPageAnnotationsData } from "@/routes/$locale/-page-annotations-data";
import { extractTocItems } from "../_domain/extract-toc-items";
import { mdastToReact } from "./mdast-to-react";
import { usePageWordGlosses } from "./segment-glosses/use-page-word-glosses";
import { SubHeader } from "./sub-header";

interface ContentWithTranslationsProps {
	pageDetail: PageDetail;
	locale: string;
}

const contentPromises = new WeakMap<
	PageDetail,
	ReturnType<typeof mdastToReact>
>();

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
	const { data: glossedWords } = usePageWordGlosses(pageDetail.id, locale);
	const displayPageDetail = useMemo(() => {
		if (!annotations && !glossedWords) return pageDetail;
		const wordsBySegment = new Map<number, NonNullable<typeof glossedWords>>();
		for (const word of glossedWords ?? []) {
			const segmentWords = wordsBySegment.get(word.segmentId) ?? [];
			segmentWords.push(word);
			wordsBySegment.set(word.segmentId, segmentWords);
		}
		return {
			...pageDetail,
			segments: pageDetail.segments.map((segment) => ({
				...segment,
				annotations: annotations?.[String(segment.id)] ?? segment.annotations,
				words: wordsBySegment.get(segment.id) ?? [],
			})),
		};
	}, [annotations, glossedWords, pageDetail]);
	const tocItems = extractTocItems({
		mdast: displayPageDetail.mdastJson,
		segments: displayPageDetail.segments,
	});

	const titleSegment = displayPageDetail.segments.find(
		(segment) => segment.number === 0,
	);

	let contentPromise = contentPromises.get(displayPageDetail);
	if (!contentPromise) {
		contentPromise = mdastToReact({
			mdast: displayPageDetail.mdastJson,
			segments: displayPageDetail.segments,
		});
		contentPromises.set(displayPageDetail, contentPromise);
	}
	const content = use(contentPromise);
	const markdown = mdastToMarkdown(displayPageDetail.mdastJson);
	if (!titleSegment) return null;
	return (
		<>
			<h1 className="mb-0! ">
				<SegmentElement segment={titleSegment} />
			</h1>
			<SubHeader
				markdown={markdown}
				pageDetail={displayPageDetail}
				tocItems={tocItems}
			/>
			<div className="js-content">{content}</div>
		</>
	);
}
