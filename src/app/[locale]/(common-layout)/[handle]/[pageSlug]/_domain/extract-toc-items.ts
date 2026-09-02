import GithubSlugger from "github-slugger";
import type { Heading, Root } from "mdast";
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";
import type { SegmentForDetail, TitleSegment } from "@/app/[locale]/types";

export interface TocItem {
	anchorId: string;
	level: number;
	segment: TitleSegment;
}

const MAX_TOC_DEPTH = 4;

export function extractTocItems({
	mdast,
	segments,
}: {
	mdast: Root;
	segments: SegmentForDetail[];
}): TocItem[] {
	// セグメント番号で引けるようにして、見出しとセグメントを対応付ける。
	const segmentsMap = new Map<number, SegmentForDetail>(
		segments.map((segment) => [segment.number, segment]),
	);
	const items: TocItem[] = [];
	const slugger = new GithubSlugger();

	visit(mdast, "heading", (heading: Heading) => {
		const number = Number(heading.data?.hProperties?.["data-number-id"]);
		const segment = Number.isInteger(number)
			? segmentsMap.get(number)
			: undefined;
		const anchorId = slugger.slug(segment?.text ?? toString(heading));
		if (heading.depth > MAX_TOC_DEPTH) return;
		if (!segment?.text.trim()) return;

		items.push({
			anchorId,
			level: heading.depth,
			segment: toTitleSegment(segment),
		});
	});

	return items;
}

function toTitleSegment(segment: SegmentForDetail): TitleSegment {
	return {
		id: segment.id,
		pageId: segment.pageId,
		number: segment.number,
		text: segment.text,
		translationText: segment.translationText,
	};
}
