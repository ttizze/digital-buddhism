import GithubSlugger from "github-slugger";
import type { TitleSegment } from "@/app/[locale]/types";
import {
	CONTENT_VIEW_TAG,
	contentViewText,
	type ContentViewNode,
	materializeContentViewSegment,
} from "./page-content-view";

export interface TocItem {
	anchorId: string;
	level: number;
	segment: TitleSegment;
}

const MAX_TOC_DEPTH = 4;

export function extractTocItems({
	nodes,
	pageId,
}: {
	nodes: ContentViewNode[];
	pageId: number;
}): TocItem[] {
	const items: TocItem[] = [];
	const slugger = new GithubSlugger();
	collect(nodes);
	return items;

	function collect(children: ContentViewNode[]): void {
		for (const node of children) {
			if (!Array.isArray(node)) continue;
			const tag = node[0];
			if (
				tag >= CONTENT_VIEW_TAG.heading1 &&
				tag <= CONTENT_VIEW_TAG.heading6
			) {
				const fallbackText = contentViewText(node[1]);
				const segment = node[2]
					? materializeContentViewSegment(node[2], pageId, fallbackText)
					: null;
				const anchorId = slugger.slug(segment?.text ?? fallbackText);
				if (tag <= MAX_TOC_DEPTH && segment?.text.trim()) {
					items.push({
						anchorId,
						level: tag,
						segment: {
							id: segment.id,
							pageId: segment.pageId,
							number: segment.number,
							text: segment.text,
							translationText: segment.translationText,
						},
					});
				}
			}
			collect(node[1]);
		}
	}
}
