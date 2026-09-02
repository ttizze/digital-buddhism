import type { Root } from "mdast";
import { removePosition } from "unist-util-remove-position";
import { VFile } from "vfile";
import type { SegmentDraft } from "./remark-hash-and-segments";

export interface SegmentPipelineResult {
	mdastJson: Root;
	segments: SegmentDraft[];
	file: VFile;
}

interface SegmentProcessor {
	parse(file: VFile): Root;
	run(tree: Root, file: VFile): Promise<Root>;
}

/**
 * remarkHashAndSegments を末尾に持つ unified プロセッサを実行し、
 * MDAST(JSON) + SegmentDraft[] を返す共通ランナー。
 */
export async function runSegmentPipeline(
	processor: SegmentProcessor,
	source: string,
): Promise<SegmentPipelineResult> {
	const file = new VFile({ value: source });
	const tree = await processor.run(processor.parse(file), file);

	// 余計な position を削除して軽量化
	removePosition(tree, { force: true });
	const segments = file.data.segments;
	if (!segments)
		throw new Error("remarkHashAndSegments did not produce segments");

	return {
		mdastJson: tree,
		segments,
		file,
	};
}
