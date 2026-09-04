import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { Node } from "@xmldom/xmldom";
import { DOMParser } from "@xmldom/xmldom";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { getFileData } from "../books";
import { convertXmlFileToMarkdown } from "../cli";
import { renderBookMarkdown, splitBookMarkdownBySiteToc } from "../render";
import { ELEMENT_NODE, getChildElements, TEXT_NODE } from "../tei";
import type { BookDoc } from "../types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tempDirs.push(directory);
	return directory;
}

function collectTextFragments(node: Node, fragments: string[]): void {
	if (node.nodeType === TEXT_NODE) {
		const text = (node.nodeValue ?? "").replace(/\s+/g, " ").trim();
		if (text.length > 0) fragments.push(text);
		return;
	}
	if (node.nodeType !== ELEMENT_NODE) return;
	for (let child = node.firstChild; child; child = child.nextSibling) {
		collectTextFragments(child, fragments);
	}
}

function stripMarkdownFormatting(markdown: string): string {
	return markdown
		.replace(/<!--[^>]+-->/g, " ")
		.replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
		.replace(/[\n#*_{}`~]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

afterEach(() => {
	while (tempDirs.length > 0) {
		const directory = tempDirs.pop();
		if (directory) fs.rmSync(directory, { recursive: true, force: true });
	}
});

describe("Tipitaka.org の記事境界による ROMN 変換", () => {
	test("TOCにない章を前の記事へ残し、元の章番号とbook境界を次の記事へ引き継ぐ", () => {
		const markdown = `# Dīghanikāyo

<!--book:dn1-->

## Sīlakkhandhavaggapāḷi

### 1. Paṭhamasuttaṃ

{para:1} A

### 2. TOCにない章

{para:2} B

### 3. Tatiyasuttaṃ

{para:3} C
`;
		const parts = splitBookMarkdownBySiteToc(markdown, [
			{ title: "1. Paṭhamasuttaṃ", outputFileName: "sample0.md" },
			{ title: "3. Tatiyasuttaṃ", outputFileName: "sample1.md" },
		]);

		expect(parts).toHaveLength(2);
		expect(parts[0]?.markdown).toContain("# 1. Paṭhamasuttaṃ");
		expect(parts[0]?.markdown).toContain("<!--chapter:1-->");
		expect(parts[0]?.markdown).toContain("### 2. TOCにない章");
		expect(parts[1]?.markdown).toBe(`# 3. Tatiyasuttaṃ

<!--book:dn1-->

<!--chapter:3-->

{para:3} C
`);
	});

	test("TOCの先頭が原文見出しにない場合は序文を先頭記事にする", () => {
		const parts = splitBookMarkdownBySiteToc(
			"# Nikāyo\n\n序文\n\n### 1. Chapter\n\n本文\n",
			[
				{ title: "Ganthārambhakathā", outputFileName: "sample0.md" },
				{ title: "1. Chapter", outputFileName: "sample1.md" },
			],
		);

		expect(parts[0]?.markdown).toContain("# Ganthārambhakathā\n\n# Nikāyo");
		expect(parts[0]?.markdown).toContain("序文");
		expect(parts[1]?.markdown).toContain("<!--chapter:1-->");
	});

	test("book境界を非表示マーカーとしてMarkdownへ保持する", () => {
		const parser = new DOMParser();
		const document = parser.parseFromString(
			'<body><div id="an2" type="book"><p n="1">本文</p></div></body>',
			"application/xml",
		);
		const body = document.getElementsByTagName("body").item(0);
		if (!body) throw new Error("<body> element is required");
		const doc: BookDoc = {
			nodes: getChildElements(body),
			dirSegments: ["book-marker"],
		};

		const markdown = renderBookMarkdown(doc);

		expect(markdown).toContain("<!--book:an2-->");
		expect(markdown).toContain("{para:1} 本文");
	});

	test("hangnumの段落番号をカスタムブロック内へ保持する", () => {
		const parser = new DOMParser();
		const document = parser.parseFromString(
			'<body><p rend="hangnum" n="1"><hi rend="paranum">1</hi><hi rend="dot">.</hi></p><p rend="gatha1">詩句</p></body>',
			"application/xml",
		);
		const body = document.getElementsByTagName("body").item(0);
		if (!body) throw new Error("<body> element is required");
		const doc: BookDoc = {
			nodes: getChildElements(body),
			dirSegments: ["hangnum"],
		};

		const markdown = renderBookMarkdown(doc);

		expect(markdown).toContain("::hangnum\n{para:1} 1\\.\n::");
	});

	test("元サイトのTOCと同じ5記事へ変換する", async () => {
		const sampleFile = path.resolve(__dirname, "fixtures", "abh01m.mul.xml");
		const outputDir = createTempDir("site-split-convert-");

		await convertXmlFileToMarkdown(sampleFile, outputDir);

		const classification = getFileData(path.basename(sampleFile).toLowerCase());
		const expectedDir = path.join(outputDir, ...classification.dirSegments);
		const expectedFiles = Array.from(
			{ length: 5 },
			(_, position) => `abh01m.mul${position}.md`,
		);
		expect(fs.readdirSync(expectedDir).sort()).toEqual(expectedFiles);
		expect(
			fs.readFileSync(path.join(expectedDir, expectedFiles[0] ?? ""), "utf8"),
		).toMatch(/^# Mātikā$/m);
		expect(
			fs.readFileSync(path.join(expectedDir, expectedFiles[4] ?? ""), "utf8"),
		).toMatch(/^# 4\. Aṭṭhakathākaṇḍaṃ$/m);
	});

	test("分割後もROMN XMLの本文を保持する", async () => {
		const sampleFile = path.resolve(__dirname, "fixtures", "abh01m.mul.xml");
		const outputDir = createTempDir("site-split-text-");

		await convertXmlFileToMarkdown(sampleFile, outputDir);

		const classification = getFileData(path.basename(sampleFile).toLowerCase());
		const expectedDir = path.join(outputDir, ...classification.dirSegments);
		const markdown = Array.from({ length: 5 }, (_, position) =>
			fs.readFileSync(
				path.join(expectedDir, `abh01m.mul${position}.md`),
				"utf8",
			),
		).join("\n");
		const plainMarkdown = stripMarkdownFormatting(markdown);

		const parser = new DOMParser({ errorHandler: () => undefined });
		const document = parser.parseFromString(
			fs.readFileSync(sampleFile, "utf16le").replace(/^\uFEFF/, ""),
			"application/xml",
		);
		const body = document.getElementsByTagName("body").item(0);
		if (!body) throw new Error("<body> element is required");
		const fragments: string[] = [];
		collectTextFragments(body, fragments);

		for (const fragment of fragments) {
			const normalized = fragment
				.replace(/`+/g, "")
				.replace(/\s+/g, " ")
				.trim();
			if (!normalized) continue;
			if (!plainMarkdown.includes(normalized)) {
				throw new Error(`Markdown output is missing: ${fragment}`);
			}
		}
	});

	test("複数のbodyを含むXMLは拒否する", async () => {
		const filePath = path.join(
			createTempDir("site-split-multibody-source-"),
			"abh01m.mul.xml",
		);
		fs.writeFileSync(
			filePath,
			"<root><body><p>First</p></body><body><p>Second</p></body></root>",
			"utf16le",
		);

		await expect(
			convertXmlFileToMarkdown(
				filePath,
				createTempDir("site-split-multibody-output-"),
			),
		).rejects.toThrow(/Multiple <body>/);
	});
});
