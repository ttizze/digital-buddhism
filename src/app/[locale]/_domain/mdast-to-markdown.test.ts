import type { Root } from "mdast";
import { describe, expect, it } from "vite-plus/test";
import { mdastToMarkdown } from "./mdast-to-markdown";

describe("mdastToMarkdown", () => {
	it("mdastをMarkdown文字列に変換する", () => {
		const mdast: Root = {
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [{ type: "text", value: "Hello" }],
				},
			],
		};

		const result = mdastToMarkdown(mdast);

		expect(result.trim()).toBe("Hello");
	});
});
