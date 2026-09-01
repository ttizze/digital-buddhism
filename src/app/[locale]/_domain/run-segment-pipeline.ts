import { removePosition } from "unist-util-remove-position";
import { VFile } from "vfile";
import type { JsonValue } from "@/drizzle/types";
import type { SegmentDraft } from "./remark-hash-and-segments";

export interface SegmentPipelineResult {
	mdastJson: JsonValue; // DB 書き込み用
	segments: SegmentDraft[];
	file: VFile; // ログや警告を見たい時用
}

/**
 * remarkHashAndSegments を末尾に持つ unified プロセッサを実行し、
 * MDAST(JSON) + SegmentDraft[] を返す共通ランナー。
 */
export async function runSegmentPipeline<Tree>(
	processor: {
		parse(file: VFile): Tree;
		run(tree: Tree, file: VFile): Promise<unknown>;
	},
	source: string,
): Promise<SegmentPipelineResult> {
	const file = new VFile({ value: source });
	const tree = await processor.run(processor.parse(file), file);

	// 余計な position を削除して軽量化
	removePosition(tree as Parameters<typeof removePosition>[0], {
		force: true,
	});

	return {
		mdastJson: tree as JsonValue,
		segments: (file.data as { segments: SegmentDraft[] }).segments,
		file,
	};
}
