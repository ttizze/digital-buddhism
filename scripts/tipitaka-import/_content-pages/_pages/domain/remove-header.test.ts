import { describe, expect, it } from "vite-plus/test";
import { removeHeader } from "./remove-header";

describe("removeHeader", () => {
	it("ページ見出しをタイトルと本文へ分離する", () => {
		const markdown = `
# タイトル

本文の内容です。
複数行の本文。`;

		const result = removeHeader(markdown);

		expect(result.header).toBe("タイトル");
		expect(result.body).toBe(`本文の内容です。
複数行の本文。`);
	});

	it("ページ見出し直後の下位見出しは本文へ残す", () => {
		const markdown = `
# タイトル
## サブタイトル

本文の内容です。`;

		const result = removeHeader(markdown);

		expect(result.header).toBe("タイトル");
		expect(result.body).toBe(`## サブタイトル

本文の内容です。`);
	});

	it("ページ見出しがないMarkdownは拒否する", () => {
		const markdown = `本文の内容です。
## これは削除されない`;

		expect(() => removeHeader(markdown)).toThrow(
			"Tipitaka Markdown has no page header",
		);
	});
});
