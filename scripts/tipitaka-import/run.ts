import { importAllContentPages } from "./_content-pages/application/import-all-content-pages";
import { createCategoryPages } from "./_create-category-pages/application/create-category-pages";
import { setupInitialRequirements } from "./_initial-setup/application/setup-initial-requirements";
import { withImportRun } from "./application/import-tracking";
import { createCliLogger } from "./logger";
import { readBooksJson } from "./utils/books";

export function assertLocalTipitakaImportUrl(databaseUrl: string): void {
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(databaseUrl);
	} catch (error) {
		throw new Error("TURSO_DATABASE_URL must be a valid URL", { cause: error });
	}

	const isLocalFile =
		parsedUrl.protocol === "file:" &&
		(parsedUrl.hostname === "" || parsedUrl.hostname === "localhost");
	const isLoopbackHttp =
		parsedUrl.protocol === "http:" &&
		(parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost");
	if (!isLocalFile && !isLoopbackHttp) {
		throw new Error(
			"Tipitaka import only accepts a local database; export production, update the local SQLite file, then import it as a new Turso database",
		);
	}
}

export async function runTipitakaImport(): Promise<void> {
	const databaseUrl = process.env.TURSO_DATABASE_URL;
	if (!databaseUrl) throw new Error("TURSO_DATABASE_URL is not defined");
	assertLocalTipitakaImportUrl(databaseUrl);

	const logger = createCliLogger("tipitaka-import");
	logger.info("Starting Tipitaka import", {
		logLevel: process.env.LOG_LEVEL || "default",
	});

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
			catalogImportFileId,
		);
	});
}
