import { toString as mdastToString } from "mdast-util-to-string";
import rehypeParse from "rehype-parse";
import rehypeRemark, {
	type Options as RehypeRemarkOptions,
} from "rehype-remark";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";
import { VFile } from "vfile";
/* html-to-mdast-with-segments.ts ----------------------------------------- */
import { escapeHtml } from "@/app/[locale]/_domain/remark-custom-blocks";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { remarkHashAndSegments } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { JsonValue } from "@/drizzle/types";

interface Params {
	header?: string;
	html: string;
}

interface Result {
	mdastJson: JsonValue; // DB 書き込み用
	segments: SegmentDraft[];
	file: VFile; // ログや警告を見たい時用
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
}: Params): Promise<Result> {
	/* 1. パーサ + 変換プラグインだけを組む ----------------------------- */
	const processor = unified()
		.use(rehypeParse, { fragment: true }) // HTML → HAST
		.use(rehypeSanitize, sanitizeSchema) // XSS 対策
		.use(rehypeRemark, rehypeRemarkOptions) // HAST → MDAST
		.use(remarkHashAndSegments(header)); // ハッシュ抽出

	/* 2. VFile を自前で作り ↓ parse → run ----------------------------- */
	const file = new VFile({ value: html });
	let tree = processor.parse(file); // HAST
	tree = await processor.run(tree, file); // MDAST + segments

	/* 3. position を削ぎ落として軽量化 ------------------------------- */
	removePosition(tree, { force: true });

	return {
		mdastJson: tree as JsonValue,
		segments: (file.data as { segments: SegmentDraft[] }).segments,
		file,
	};
}
