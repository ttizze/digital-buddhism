import GithubSlugger from "github-slugger";
import type { Nodes, Parents, Root } from "mdast";
import { createElement, Fragment, type JSX, type ReactNode } from "react";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { Segment } from "@/app/[locale]/types";
import type { JsonObject, JsonValue } from "@/drizzle/types";

type SegmentTag = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "li";

interface Params<T extends Segment = Segment> {
	mdast: JsonValue;
	segments: T[];
	/** 翻訳をクリック可能にし、投票・追加UIを開けるようにする。 */
	interactive?: boolean;
}

interface RenderState {
	interactive: boolean;
	segmentsByNumber: ReadonlyMap<number, Segment>;
	slugger: GithubSlugger;
}

interface MdastData {
	hProperties?: Record<string, unknown>;
}

function toRoot(value: JsonValue): Root | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const object = value as JsonObject;
	if (object.type !== "root" || !Array.isArray(object.children)) return null;
	return object as unknown as Root;
}

function getHProperties(node: Nodes): Record<string, unknown> | undefined {
	return (node.data as MdastData | undefined)?.hProperties;
}

function getDataNumber(node: Nodes): number | null {
	const value = getHProperties(node)?.["data-number-id"];
	if (typeof value !== "string" && typeof value !== "number") return null;
	const number = Number(value);
	return Number.isInteger(number) ? number : null;
}

function getTagProps(node: Nodes): Record<string, unknown> {
	const properties = getHProperties(node);
	if (!properties) return {};

	const props: Record<string, unknown> = {};
	const className = properties.class ?? properties.className;
	if (typeof className === "string") props.className = className;
	const number = properties["data-number-id"];
	if (typeof number === "string" || typeof number === "number") {
		props["data-number-id"] = number;
	}
	return props;
}

function extractText(node: Nodes): string {
	if (node.type === "text") return node.value;
	if (!("children" in node)) return "";

	let text = "";
	for (const child of node.children) {
		text += extractText(child);
	}
	return text;
}

function renderChildren(
	node: Parents,
	state: RenderState,
	parentKey: string,
): ReactNode[] {
	return node.children.map((child, index) =>
		renderNode(child, state, `${parentKey}.${index}`),
	);
}

function renderSegmentTag(
	tag: SegmentTag,
	node: Nodes,
	children: ReactNode,
	state: RenderState,
	key: string,
	extraProps: Record<string, unknown> = {},
): ReactNode {
	const number = getDataNumber(node);
	const segment =
		number === null ? undefined : state.segmentsByNumber.get(number);
	const tagProps = { ...getTagProps(node), ...extraProps };
	if (!segment) return createElement(tag, { key, ...tagProps }, children);

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

function renderListNode(
	node: Extract<Nodes, { type: "list" }>,
	state: RenderState,
	key: string,
): ReactNode {
	const ordered = node.ordered === true;
	const tight = node.spread !== true;
	const children = node.children.map((child, index) =>
		renderNode(child, state, `${key}.${index}`, tight && child.spread !== true),
	);
	const props: Record<string, unknown> = { key };
	if (ordered && node.start && node.start !== 1) props.start = node.start;
	return createElement(ordered ? "ol" : "ul", props, children);
}

function renderListItemNode(
	node: Extract<Nodes, { type: "listItem" }>,
	state: RenderState,
	key: string,
	tightListItem: boolean,
): ReactNode {
	const onlyChild = node.children.length === 1 ? node.children[0] : null;
	const paragraph =
		tightListItem && onlyChild?.type === "paragraph" ? onlyChild : null;
	const segmentNode =
		getDataNumber(node) === null && paragraph ? paragraph : node;
	const children = paragraph
		? renderChildren(paragraph, state, `${key}.0`)
		: renderChildren(node, state, key);
	return renderSegmentTag("li", segmentNode, children, state, key);
}

function renderNode(
	node: Nodes,
	state: RenderState,
	key: string,
	tightListItem = false,
): ReactNode {
	if (node.type === "html") return null;
	if (node.type === "text") return node.value;
	if (node.type === "list") {
		return renderListNode(node, state, key);
	}
	if (node.type === "listItem") {
		return renderListItemNode(node, state, key, tightListItem);
	}

	const children =
		"children" in node ? renderChildren(node, state, key) : undefined;
	if (node.type === "root") {
		return <Fragment key={key}>{children}</Fragment>;
	}
	if (node.type === "paragraph") {
		return renderSegmentTag("p", node, children, state, key);
	}
	if (node.type === "heading") {
		const tag = `h${node.depth}` as SegmentTag;
		const number = getDataNumber(node);
		const text =
			(number === null ? null : state.segmentsByNumber.get(number)?.text) ??
			extractText(node);
		return renderSegmentTag(tag, node, children, state, key, {
			id: state.slugger.slug(text),
		});
	}
	if (node.type === "strong") {
		return createElement("strong", { key }, children);
	}

	// Tipitakaコーパス外のMDASTは装飾だけ落とし、子のテキストを保持する。
	return <Fragment key={key}>{children}</Fragment>;
}

/** Tipitaka取込時に生成したMDASTを、HTML文字列へ変換せず直接描画する。 */
export function mdastToReact<T extends Segment = Segment>({
	mdast,
	segments,
	interactive = true,
}: Params<T>): JSX.Element | null {
	const root = toRoot(mdast);
	if (!root) return null;

	const segmentsByNumber = new Map<number, Segment>();
	for (const segment of segments) {
		segmentsByNumber.set(segment.number, segment);
	}
	const state: RenderState = {
		interactive,
		segmentsByNumber,
		slugger: new GithubSlugger(),
	};
	return <Fragment>{renderChildren(root, state, "root")}</Fragment>;
}
