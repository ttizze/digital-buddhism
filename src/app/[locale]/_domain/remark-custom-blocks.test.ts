import type { Html, Paragraph, Root } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Node } from "unist";
import { VFile } from "vfile";
import { describe, expect, it } from "vite-plus/test";
import { remarkCustomBlocks } from "./remark-custom-blocks";

async function parseMarkdown(markdown: string): Promise<Root> {
	const processor = unified().use(remarkParse).use(remarkCustomBlocks);
	const file = new VFile({ value: markdown });
	let tree = processor.parse(file);
	tree = await processor.run(tree, file);
	if (!isRoot(tree)) throw new Error("Expected an MDAST root");
	return tree;
}

function isRoot(node: Node): node is Root {
	return node.type === "root";
}

function findParagraphByClass(tree: Root, className: string): Paragraph {
	for (const child of tree.children) {
		if (child.type !== "paragraph") continue;
		if (child.data?.hProperties?.class === className) return child;
	}
	throw new Error(`Paragraph with class ${className} not found`);
}

function firstParagraph(tree: Root): Paragraph {
	const paragraph = tree.children.find((node) => node.type === "paragraph");
	if (!paragraph || paragraph.type !== "paragraph") {
		throw new Error("Paragraph not found");
	}
	return paragraph;
}

describe("remarkCustomBlocks", () => {
	it("gatha/indent/centreブロックはMDASTのparagraphに変換され、data.hProperties.classが付与される", async () => {
		const markdown = [
			"::gatha1\nGatha line one\n::",
			"::gathalast\nGatha line last\n::",
			"::indent\nIndented sentence\n::",
			"::centre\nCentered sentence\n::",
		].join("\n\n");
		const tree = await parseMarkdown(markdown);

		expect(mdastToString(findParagraphByClass(tree, "gatha1"))).toBe(
			"Gatha line one",
		);
		expect(mdastToString(findParagraphByClass(tree, "gathalast"))).toBe(
			"Gatha line last",
		);
		expect(mdastToString(findParagraphByClass(tree, "indent"))).toBe(
			"Indented sentence",
		);
		expect(mdastToString(findParagraphByClass(tree, "centre"))).toBe(
			"Centered sentence",
		);
	});

	it("装飾を含むgathaブロックはMDASTのparagraphになり、data.hProperties.classが付与される", async () => {
		const markdown = "::gatha1\nLine **bold** end\n::";
		const tree = await parseMarkdown(markdown);

		const paragraph = findParagraphByClass(tree, "gatha1");
		expect(mdastToString(paragraph)).toBe("Line bold end");
	});

	it("インラインのnote/pb記法はHTMLノードに変換される", async () => {
		const markdown = "Text {note:note} {pb:P:1.0001} end";
		const tree = await parseMarkdown(markdown);

		const paragraph = firstParagraph(tree);
		const htmlNodes = paragraph.children.filter(
			(node): node is Html => node.type === "html",
		);
		const htmlValues = htmlNodes.map((node) => node.value).join(" ");

		expect(htmlValues).toContain('class="note"');
		expect(htmlValues).toContain('class="pb"');
	});

	it("未知のブロック記法はテキストとして残る", async () => {
		const markdown = "::unknown\nText\n::";
		const tree = await parseMarkdown(markdown);

		const paragraph = firstParagraph(tree);
		expect(mdastToString(paragraph)).toBe("::unknown\nText\n::");
	});
});
