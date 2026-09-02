import type { SegmentGlossUnit } from "@/app/api/segment-glosses/_domain/segment-glosses";
import type { List, ListItem, Nodes, Parents } from "mdast";
import type { PageContentData } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/load-page-content-data";
import type {
	PageDetail,
	SegmentForDetail,
	SegmentForPage,
} from "@/app/[locale]/types";
import type { TipitakaTextLevel } from "@/drizzle/types";

export const CONTENT_VIEW_TAG = {
	paragraph: 0,
	heading1: 1,
	heading2: 2,
	heading3: 3,
	heading4: 4,
	heading5: 5,
	heading6: 6,
	unorderedList: 7,
	orderedList: 8,
	listItem: 9,
	strong: 10,
} as const;

type ContentViewTag = (typeof CONTENT_VIEW_TAG)[keyof typeof CONTENT_VIEW_TAG];

const HEADING_TAGS = [
	CONTENT_VIEW_TAG.heading1,
	CONTENT_VIEW_TAG.heading2,
	CONTENT_VIEW_TAG.heading3,
	CONTENT_VIEW_TAG.heading4,
	CONTENT_VIEW_TAG.heading5,
	CONTENT_VIEW_TAG.heading6,
] as const;

type ContentViewAnnotation = [
	id: number,
	pageId: number,
	number: number,
	text: string,
	translationText: string | null,
	textLevel: TipitakaTextLevel | null,
	glossUnits?: SegmentGlossUnit[] | null,
];

export type ContentViewSegment = [
	id: number,
	number: number,
	translationText: string | null,
	textLevel: TipitakaTextLevel | null,
	sourceText?: string | null,
	annotations?: ContentViewAnnotation[] | null,
	glossUnits?: SegmentGlossUnit[] | null,
];

export type ContentViewNode =
	| string
	| [
			tag: ContentViewTag,
			children: ContentViewNode[],
			segment?: ContentViewSegment | null,
			className?: string | null,
			dataNumberId?: string | number | null,
			start?: number | null,
	  ];

export type PageContentBody = [
	titleSegment: ContentViewSegment | null,
	nodes: ContentViewNode[],
];

export type PageDetailView = Omit<PageDetail, "mdastJson" | "segments">;

export type PageContentViewData = Omit<PageContentData, "pageDetail"> & {
	pageDetail: PageDetailView;
	body: string;
};

type SegmentAnnotations = SegmentForDetail["annotations"];

export function buildPageContentView(
	data: PageContentData,
): PageContentViewData {
	const { mdastJson, segments, ...pageDetail } = data.pageDetail;
	const segmentsByNumber = new Map<number, SegmentForDetail>();
	for (const segment of segments) {
		segmentsByNumber.set(segment.number, segment);
	}
	const nodes: ContentViewNode[] = [];
	appendChildren(mdastJson, segmentsByNumber, nodes);
	const titleSegment = segmentsByNumber.get(0);
	const body: PageContentBody = [
		titleSegment ? compactSegment(titleSegment, "") : null,
		nodes,
	];

	return {
		...data,
		pageDetail,
		body: JSON.stringify(body),
	};
}

export function parsePageContentBody(body: string): PageContentBody {
	// SAFETY: buildPageContentView is the sole producer of this internal payload.
	return JSON.parse(body) as PageContentBody;
}

export function contentViewText(nodes: ContentViewNode[]): string {
	let text = "";
	for (const node of nodes) {
		text += Array.isArray(node) ? contentViewText(node[1]) : node;
	}
	return text;
}

export function materializeContentViewSegment(
	data: ContentViewSegment,
	pageId: number,
	fallbackText: string,
	annotations?: SegmentAnnotations,
	glossUnits?: SegmentGlossUnit[],
): SegmentForDetail {
	return {
		id: data[0],
		pageId,
		number: data[1],
		text: data[4] ?? fallbackText,
		translationText: data[2],
		textLevel: data[3],
		annotations: annotations ?? data[5]?.map(unpackAnnotation) ?? [],
		glossUnits: glossUnits ?? data[6] ?? undefined,
	};
}

function appendChildren(
	node: Parents,
	segmentsByNumber: ReadonlyMap<number, SegmentForDetail>,
	target: ContentViewNode[],
	tightListItem = false,
): void {
	for (const child of node.children) {
		appendNode(child, segmentsByNumber, target, tightListItem);
	}
}

function appendNode(
	node: Nodes,
	segmentsByNumber: ReadonlyMap<number, SegmentForDetail>,
	target: ContentViewNode[],
	tightListItem = false,
): void {
	if (node.type === "html") return;
	if (node.type === "text") {
		target.push(node.value);
		return;
	}
	if (node.type === "strong") {
		target.push(
			compactNode(
				CONTENT_VIEW_TAG.strong,
				buildChildren(node, segmentsByNumber),
			),
		);
		return;
	}
	if (node.type === "paragraph") {
		target.push(
			buildSegmentNode(CONTENT_VIEW_TAG.paragraph, node, segmentsByNumber),
		);
		return;
	}
	if (node.type === "heading") {
		appendHeadingNode(node, segmentsByNumber, target);
		return;
	}
	if (node.type === "list") {
		appendListNode(node, segmentsByNumber, target);
		return;
	}
	if (node.type === "listItem") {
		appendListItemNode(node, segmentsByNumber, target, tightListItem);
		return;
	}

	if ("children" in node) appendChildren(node, segmentsByNumber, target);
}

function appendHeadingNode(
	node: Extract<Nodes, { type: "heading" }>,
	segmentsByNumber: ReadonlyMap<number, SegmentForDetail>,
	target: ContentViewNode[],
): void {
	const depth = node.depth;
	const tag = HEADING_TAGS[depth - 1];
	if (tag !== undefined) {
		target.push(buildSegmentNode(tag, node, segmentsByNumber));
	}
}

function appendListNode(
	node: List,
	segmentsByNumber: ReadonlyMap<number, SegmentForDetail>,
	target: ContentViewNode[],
): void {
	const children: ContentViewNode[] = [];
	const tight = node.spread !== true;
	for (const child of node.children) {
		appendNode(
			child,
			segmentsByNumber,
			children,
			tight && child.spread !== true,
		);
	}
	const ordered = node.ordered === true;
	const start =
		ordered &&
		node.start !== null &&
		node.start !== undefined &&
		node.start !== 1
			? node.start
			: null;
	target.push(
		compactNode(
			ordered ? CONTENT_VIEW_TAG.orderedList : CONTENT_VIEW_TAG.unorderedList,
			children,
			null,
			null,
			null,
			start,
		),
	);
}

function appendListItemNode(
	node: ListItem,
	segmentsByNumber: ReadonlyMap<number, SegmentForDetail>,
	target: ContentViewNode[],
	tightListItem: boolean,
): void {
	const onlyChild = node.children.length === 1 ? node.children[0] : null;
	const paragraph =
		tightListItem && onlyChild?.type === "paragraph" ? onlyChild : null;
	const segmentNode =
		getDataNumber(node) === null && paragraph ? paragraph : node;
	const children = paragraph
		? buildChildren(paragraph, segmentsByNumber)
		: buildChildren(node, segmentsByNumber);
	target.push(
		buildSegmentNode(
			CONTENT_VIEW_TAG.listItem,
			segmentNode,
			segmentsByNumber,
			children,
		),
	);
}

function buildChildren(
	node: Parents,
	segmentsByNumber: ReadonlyMap<number, SegmentForDetail>,
): ContentViewNode[] {
	const children: ContentViewNode[] = [];
	appendChildren(node, segmentsByNumber, children);
	return children;
}

function buildSegmentNode(
	tag: ContentViewTag,
	node: Extract<Nodes, { type: "heading" | "listItem" | "paragraph" }>,
	segmentsByNumber: ReadonlyMap<number, SegmentForDetail>,
	children = buildChildren(node, segmentsByNumber),
): Exclude<ContentViewNode, string> {
	const rawNumber = getRawDataNumber(node);
	const number = getDataNumber(node);
	const segment = number === null ? undefined : segmentsByNumber.get(number);
	return compactNode(
		tag,
		children,
		segment ? compactSegment(segment, contentViewText(children)) : null,
		getClassName(node),
		segment ? null : rawNumber,
	);
}

function compactNode(
	tag: ContentViewTag,
	children: ContentViewNode[],
	segment: ContentViewSegment | null = null,
	className: string | null = null,
	dataNumberId: string | number | null = null,
	start: number | null = null,
): Exclude<ContentViewNode, string> {
	const node: Exclude<ContentViewNode, string> = [
		tag,
		children,
		segment,
		className,
		dataNumberId,
		start,
	];
	while (node.at(-1) === null) node.pop();
	return node;
}

function compactSegment(
	segment: SegmentForDetail,
	inferredText: string,
): ContentViewSegment {
	const annotations =
		segment.annotations.length > 0
			? segment.annotations.map(({ annotationSegment }) =>
					packAnnotation(annotationSegment),
				)
			: null;
	const glossUnits =
		segment.glossUnits && segment.glossUnits.length > 0
			? segment.glossUnits
			: null;
	const data: ContentViewSegment = [
		segment.id,
		segment.number,
		segment.translationText,
		segment.textLevel,
		segment.text === inferredText ? null : segment.text,
		annotations,
		glossUnits,
	];
	while (data.at(-1) === null) data.pop();
	return data;
}

function packAnnotation(segment: SegmentForPage): ContentViewAnnotation {
	const data: ContentViewAnnotation = [
		segment.id,
		segment.pageId,
		segment.number,
		segment.text,
		segment.translationText,
		segment.textLevel,
		segment.glossUnits?.length ? segment.glossUnits : null,
	];
	if (data.at(-1) === null) data.pop();
	return data;
}

function unpackAnnotation(
	data: ContentViewAnnotation,
): SegmentAnnotations[number] {
	return {
		annotationSegment: {
			id: data[0],
			pageId: data[1],
			number: data[2],
			text: data[3],
			translationText: data[4],
			textLevel: data[5],
			glossUnits: data[6] ?? undefined,
		},
	};
}

function getClassName(node: Nodes): string | null {
	const properties = node.data?.hProperties;
	return properties?.class ?? properties?.className ?? null;
}

function getDataNumber(node: Nodes): number | null {
	const value = getRawDataNumber(node);
	if (value === null) return null;
	const number = Number(value);
	return Number.isInteger(number) ? number : null;
}

function getRawDataNumber(node: Nodes): string | null {
	return node.data?.hProperties?.["data-number-id"] ?? null;
}
