import { createServerLogger } from "@/app/_service/logger.server";
import { importAllContentPages } from "./_content-pages/application/import-all-content-pages";
import { createCategoryPages } from "./_create-category-pages/application/create-category-pages";
import { setupInitialRequirements } from "./_initial-setup/application/setup-initial-requirements";
import { withImportRun } from "./application/import-tracking";
import { readBooksJson } from "./utils/books";

export async function runTipitakaImport(): Promise<void> {
	const logger = createServerLogger("tipitaka-import");
	logger.info(
		{ logLevel: process.env.LOG_LEVEL || "default" },
		"Starting Tipitaka import",
	);

	await withImportRun(async (importRunId) => {
		// Step 1: メタデータタイプとルートページを初期化する。
		const { rootPageId } = await setupInitialRequirements();

		// Step 2-3: books.jsonから各Tipitakaファイルのメタデータを取得し、
		// カテゴリツリーを構築してカテゴリページを作成する
		const { tipitakaFileMetas, importFileId: catalogImportFileId } =
			await readBooksJson(importRunId);
		const categoryPageLookup = await createCategoryPages(
			tipitakaFileMetas,
			rootPageId,
			catalogImportFileId,
		);

		// Step 4: すべてのコンテンツページをインポート
		await importAllContentPages(
			tipitakaFileMetas,
			categoryPageLookup,
			rootPageId,
			importRunId,
		);
	});
}
