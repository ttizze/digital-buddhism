import { describe, expect, it } from "vite-plus/test";
import { mdastToMarkdown } from "./mdast-to-markdown";

describe("mdastToMarkdown", () => {
	it("mdastをMarkdown文字列に変換する", () => {
		const mdast = {
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

	it("配列のmdastをルートとして扱う", () => {
		const mdast = [
			{
				type: "paragraph",
				children: [{ type: "text", value: "A" }],
			},
			{
				type: "paragraph",
				children: [{ type: "text", value: "B" }],
			},
		];

		const result = mdastToMarkdown(mdast);

		expect(result.trim()).toBe("A\n\nB");
	});
});
