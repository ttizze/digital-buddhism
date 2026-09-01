import remarkParse from "remark-parse";
import { unified } from "unified";
import { remarkCustomBlocks } from "./remark-custom-blocks";
import { remarkHashAndSegments } from "./remark-hash-and-segments";
import {
	runSegmentPipeline,
	type SegmentPipelineResult,
} from "./run-segment-pipeline";

interface Params {
	header?: string;
	markdown: string;
}

/**
 * Markdown 文字列を MDAST(JSON) + SegmentDraft[] に変換するヘルパー。
 *   – header を渡すと SegmentDraft の number=0 相当としてハッシュ化に利用できる。
 */
export async function markdownToMdastWithSegments({
	header,
	markdown,
}: Params): Promise<SegmentPipelineResult> {
	const processor = unified()
		.use(remarkParse) // Markdown → MDAST
		.use(remarkCustomBlocks) // カスタムブロック記法の解釈
		.use(remarkHashAndSegments(header)); // ハッシュ + Segment 生成

	return runSegmentPipeline(processor, markdown);
}
