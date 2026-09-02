import GithubSlugger from "github-slugger";
import { createElement, Fragment, type JSX, type ReactNode } from "react";
import type { SegmentGlossUnit } from "@/app/api/segment-glosses/_domain/segment-glosses";
import {
	SegmentElement,
	type SegmentTag,
	type SegmentTagProps,
} from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { SegmentForDetail } from "@/app/[locale]/types";
import {
	CONTENT_VIEW_TAG,
	contentViewText,
	type ContentViewNode,
	materializeContentViewSegment,
} from "../../_domain/page-content-view";

type PageAnnotations = Record<string, SegmentForDetail["annotations"]>;

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

interface Params {
	nodes: ContentViewNode[];
	pageId: number;
	annotations?: PageAnnotations;
	glossUnitsBySegment?: ReadonlyMap<number, SegmentGlossUnit[]>;
	interactive?: boolean;
}

interface RenderState {
	annotations?: PageAnnotations;
	glossUnitsBySegment: ReadonlyMap<number, SegmentGlossUnit[]>;
	interactive: boolean;
	pageId: number;
	slugger: GithubSlugger;
}

function renderChildren(
	nodes: ContentViewNode[],
	state: RenderState,
	parentKey: string,
): ReactNode[] {
	return nodes.map((node, index) =>
		renderNode(node, state, `${parentKey}.${index}`),
	);
}

function renderSegmentTag(
	tag: SegmentTag,
	node: Exclude<ContentViewNode, string>,
	children: ReactNode,
	state: RenderState,
	key: string,
	extraProps: SegmentTagProps = {},
): ReactNode {
	const segmentData = node[2];
	const tagProps: SegmentTagProps = { ...extraProps };
	if (node[3]) tagProps.className = node[3];
	if (!segmentData && node[4] != null) {
		tagProps["data-number-id"] = node[4];
	}
	if (!segmentData) return createElement(tag, { key, ...tagProps }, children);

	const segment = materializeContentViewSegment(
		segmentData,
		state.pageId,
		contentViewText(node[1]),
		state.annotations?.[String(segmentData[0])],
		state.glossUnitsBySegment.get(segmentData[0]),
	);
	return (
		<SegmentElement
			interactive={state.interactive}
			key={key}
			segment={segment}
			tagName={tag}
			tagProps={tagProps}
		>
			{children}
		</SegmentElement>
	);
}

function renderNode(
	node: ContentViewNode,
	state: RenderState,
	key: string,
): ReactNode {
	if (!Array.isArray(node)) return node;
	const children = renderChildren(node[1], state, key);
	const tag = node[0];
	if (tag === CONTENT_VIEW_TAG.strong) {
		return createElement("strong", { key }, children);
	}
	if (tag === CONTENT_VIEW_TAG.unorderedList) {
		return createElement("ul", { key }, children);
	}
	if (tag === CONTENT_VIEW_TAG.orderedList) {
		return createElement(
			"ol",
			node[5] == null ? { key } : { key, start: node[5] },
			children,
		);
	}
	if (tag === CONTENT_VIEW_TAG.listItem) {
		return renderSegmentTag("li", node, children, state, key);
	}
	if (tag === CONTENT_VIEW_TAG.paragraph) {
		return renderSegmentTag("p", node, children, state, key);
	}
	if (tag >= CONTENT_VIEW_TAG.heading1 && tag <= CONTENT_VIEW_TAG.heading6) {
		const segmentData = node[2];
		const text = segmentData?.[4] ?? contentViewText(node[1]);
		const headingTag = HEADING_TAGS[tag - CONTENT_VIEW_TAG.heading1];
		if (!headingTag) return <Fragment key={key}>{children}</Fragment>;
		return renderSegmentTag(headingTag, node, children, state, key, {
			id: state.slugger.slug(text),
		});
	}
	return <Fragment key={key}>{children}</Fragment>;
}

/** サーバーでMDASTとsegmentを統合した単一のview modelを描画する。 */
export function contentViewToReact({
	nodes,
	pageId,
	annotations,
	glossUnitsBySegment = new Map(),
	interactive = true,
}: Params): JSX.Element {
	const state: RenderState = {
		annotations,
		glossUnitsBySegment,
		interactive,
		pageId,
		slugger: new GithubSlugger(),
	};
	return <Fragment>{renderChildren(nodes, state, "root")}</Fragment>;
}
