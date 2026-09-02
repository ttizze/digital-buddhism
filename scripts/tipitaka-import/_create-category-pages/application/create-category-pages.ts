import { parseDirSegment } from "../../domain/parse-dir-segment/parse-dir-segment";
import type { TipitakaFileMeta } from "../../types";
import { createCategoryPage } from "./create-category-page";

/**
 * カテゴリページを階層的に作成する
 *
 * Tipitakaファイルのメタデータからユニークなパスを抽出し、
 * 子ノードがあるパスに対してカテゴリページをデータベースに作成します。
 * 親ページが子ページよりも先に作成される順序を保証します。
 *
 * **作成されるページの特徴**:
 * - タイトルのみのMarkdownページ（本文なし）
 * - スラグ形式: `tipitaka-{dirPath}` (例: `tipitaka-01-sutta/02-diggha-nikaya`)
 * - 親ページとの階層関係が設定される
 * - 同じ親の下ではディレクトリ名の番号を表示順として使用する
 *
 * @param tipitakaFileMetas - Tipitakaファイルのメタデータ配列
 * @param rootPageId - ルートページのID
 * @param importFileId - カテゴリ構造の出典となるbooks.jsonの記録ID
 * @returns カテゴリページのパス → ページIDのルックアップマップ
 */
export async function createCategoryPages(
	tipitakaFileMetas: TipitakaFileMeta[],
	rootPageId: number,
	importFileId: number,
): Promise<Map<string, number>> {
	const pathSet = new Set<string>();
	for (const meta of tipitakaFileMetas) {
		for (let index = 0; index < meta.dirSegments.length - 1; index++) {
			pathSet.add(meta.dirSegments.slice(0, index + 1).join("/"));
		}
	}
	const paths = [...pathSet].sort((left, right) => {
		const depthDifference = left.split("/").length - right.split("/").length;
		return depthDifference || left.localeCompare(right);
	});

	// ページIDのルックアップマップ
	const categoryPageLookup = new Map<string, number>();

	// 順番にカテゴリページを作成
	for (const dirPath of paths) {
		const dirSegments = dirPath.split("/");
		const lastSegment = dirSegments.at(-1) ?? "";
		const parentPath = dirSegments.slice(0, -1).join("/");

		// 親ページIDを取得（親パスが空の場合はルートページ、それ以外はルックアップから取得）
		const parentId = categoryPageLookup.get(parentPath) ?? rootPageId;

		// 最後のセグメントからタイトルと順序を抽出（ディレクトリ名の先頭数字が順序）
		const { title, order: position } = parseDirSegment(lastSegment);

		// カテゴリページを作成
		const pageId = await createCategoryPage({
			title,
			dirPath,
			parentId,
			position,
			importFileId,
		});

		categoryPageLookup.set(dirPath, pageId);
	}

	// ルートページもルックアップに追加
	categoryPageLookup.set("", rootPageId);

	return categoryPageLookup;
}
