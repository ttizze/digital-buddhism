import type { ReactElement } from "react";
import { createElement, type JSX } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeRaw from "rehype-raw";
import rehypeReact from "rehype-react";
import rehypeSlug from "rehype-slug";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Segment } from "@/app/[locale]/types";
import type { JsonValue } from "@/drizzle/types";
import { WrapSegment } from "./wrap-segments";

// --------------
const SEGMENTABLE = [
	"p",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"li",
	"td",
	"th",
	"blockquote",
] as const satisfies readonly (keyof JSX.IntrinsicElements)[];

interface Params<T extends Segment = Segment> {
	mdast: JsonValue;
	segments: T[];
	/**
	 * If true, render translations as clickable buttons (`data-segment-id`) so
	 * `TranslationFormOnClick` can open the vote/add UI.
	 * If false, render translation text without a button (no click behavior).
	 */
	interactive?: boolean;
}

/** mdast(JSON) → React 要素 */
export async function mdastToReact<T extends Segment = Segment>({
	mdast,
	segments,
	interactive = true,
}: Params<T>): Promise<ReactElement | null> {
	if (!mdast || Object.keys(mdast).length === 0) return null;
	// number → segment のマップは全タグで共有する（タグごとに作り直さない）
	const segmentsByNumber = new Map<number, Segment>(
		segments.map((segment) => [segment.number, segment]),
	);
	const segmentComponents = Object.fromEntries(
		SEGMENTABLE.map((tag) => [
			tag,
			WrapSegment(tag, segmentsByNumber, interactive),
		]),
	);

	const processor = unified()
		.use(remarkRehype, { allowDangerousHtml: true }) // mdast → hast
		.use(rehypeRaw) // parse raw HTML
		.use(rehypeSlug) // add slug ids
		.use(rehypeReact, {
			createElement,
			...jsxRuntime,
			components: {
				...segmentComponents,
			},
		});

	// Run plugins & stringify to React elements
	const hast = await processor.run(mdast);
	return processor.stringify(hast) as ReactElement;
}
