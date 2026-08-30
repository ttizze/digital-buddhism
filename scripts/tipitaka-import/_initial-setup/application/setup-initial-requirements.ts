import { ensureMetadataTypes } from "../db/metadata-types";
import { ensureSegmentTypes } from "../db/segment-types";
import { ensureRootPage } from "./ensure-root-page";

/**
 * インポート処理に必要な初期セットアップを行う。
 *
 * @returns 初期セットアップの結果（ルートページID）
 */
export async function setupInitialRequirements(): Promise<{
	rootPageId: number;
}> {
	// メタデータタイプを確保
	await ensureSegmentTypes();

	await ensureMetadataTypes();

	// ルートページを確保
	const rootPageId = await ensureRootPage();

	return {
		rootPageId,
	};
}
