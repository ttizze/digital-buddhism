import { describe, expect, test } from "vite-plus/test";
import { assertLocalTipitakaImportUrl } from "./run";

describe("assertLocalTipitakaImportUrl", () => {
	test.each([
		"file:/tmp/tipitaka.sqlite",
		"file::memory:",
		"http://127.0.0.1:18080",
		"http://localhost:18080",
	])("ローカルDBを許可する: %s", (databaseUrl) => {
		expect(() => assertLocalTipitakaImportUrl(databaseUrl)).not.toThrow();
	});

	test.each([
		"libsql://production.example",
		"https://production.example",
		"http://production.example",
		"file://production.example/tipitaka.sqlite",
	])("リモートDBを拒否する: %s", (databaseUrl) => {
		expect(() => assertLocalTipitakaImportUrl(databaseUrl)).toThrow(
			/only accepts a local database/,
		);
	});

	test("不正なURLを拒否する", () => {
		expect(() => assertLocalTipitakaImportUrl("not a url")).toThrow(
			/must be a valid URL/,
		);
	});
});
