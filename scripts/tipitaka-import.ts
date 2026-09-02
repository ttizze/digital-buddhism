#!/usr/bin/env bun
// スクリプト実行時はDEBUGログを有効化（環境変数で上書き可能）
// すべてのインポートより前に設定する必要がある
if (!process.env.LOG_LEVEL) {
	process.env.LOG_LEVEL = "debug";
}

async function main(): Promise<void> {
	const [{ publishTipitakaReadModelsWithWrangler }, { runTipitakaImport }] =
		await Promise.all([
			import("./tipitaka-import/application/publish-read-model"),
			import("./tipitaka-import/run"),
		]);
	await runTipitakaImport();
	await publishTipitakaReadModelsWithWrangler(
		process.argv.includes("--remote-read-model"),
	);
}

void main().catch((error) => {
	console.error(error);
	process.exit(1);
});
