import { toString as mdastToString } from "mdast-util-to-string";
import rehypeParse from "rehype-parse";
import rehypeRemark, {
	type Options as RehypeRemarkOptions,
} from "rehype-remark";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { unified } from "unified";
/* html-to-mdast-with-segments.ts ----------------------------------------- */
import { escapeHtml } from "./remark-custom-blocks";
import { remarkHashAndSegments } from "./remark-hash-and-segments";
import {
	runSegmentPipeline,
	type SegmentPipelineResult,
} from "./run-segment-pipeline";

interface Params {
	header?: string;
	html: string;
}

// pb/note の span を Markdown 入口と同じ最終表現に揃えるため、既定スキーマに属性を追加する
const sanitizeSchema: typeof defaultSchema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		span: [["className", "pb", "note"], "dataEd", "dataN", "dataValue"],
	},
};

const PB_DATA_PROPERTIES = [
	["dataEd", "data-ed"],
	["dataN", "data-n"],
	["dataValue", "data-value"],
] as const;

// rehype-remark は span を子ノードへ展開してしまうため、pb/note だけ html ノードとして保持する
const rehypeRemarkOptions: RehypeRemarkOptions = {
	handlers: {
		span(state, node) {
			const className = Array.isArray(node.properties.className)
				? node.properties.className
				: [];
			if (className.includes("pb")) {
				const attributes = PB_DATA_PROPERTIES.map(([property, attribute]) => {
					const value = node.properties[property];
					return typeof value === "string" || typeof value === "number"
						? ` ${attribute}="${escapeHtml(String(value))}"`
						: "";
				}).join("");
				return {
					type: "html" as const,
					value: `<span class="pb"${attributes}></span>`,
				};
			}
			if (className.includes("note")) {
				const text = mdastToString({
					type: "root",
					children: state.all(node),
				});
				return {
					type: "html" as const,
					value: `<span class="note">${escapeHtml(text)}</span>`,
				};
			}
			return state.all(node);
		},
	},
};

export async function htmlToMdastWithSegments({
	header,
	html,
}: Params): Promise<SegmentPipelineResult> {
	const processor = unified()
		.use(rehypeParse, { fragment: true }) // HTML → HAST
		.use(rehypeSanitize, sanitizeSchema) // XSS 対策
		.use(rehypeRemark, rehypeRemarkOptions) // HAST → MDAST
		.use(remarkHashAndSegments(header)); // ハッシュ抽出

	return runSegmentPipeline(processor, html);
}
