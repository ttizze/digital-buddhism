import type { Root } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { VFile } from "vfile";
import { describe, expect, it } from "vite-plus/test";
import {
	remarkHashAndSegments,
	type SegmentDraft,
} from "./remark-hash-and-segments";
import { runSegmentPipeline } from "./run-segment-pipeline";

async function processSegments(
	markdown: string,
	header?: string,
): Promise<VFile & { data: { segments: SegmentDraft[] } }> {
	const result = await runSegmentPipeline(
		unified().use(remarkParse).use(remarkHashAndSegments(header)),
		markdown,
	);
	result.file.value = mdastToString(result.mdastJson as unknown as Root);
	return result.file as VFile & { data: { segments: SegmentDraft[] } };
}

describe("remarkHashAndSegments", () => {
	it("パラグラフや見出しがsegments化され、number/hash/textが正しく付与される", async () => {
		const md = "Paragraph1\n\nParagraph2";
		const file = await processSegments(md, "Title");
		expect(file.data.segments).toMatchObject([
			{ text: "Title", number: 0, textAndOccurrenceHash: expect.any(String) },
			{
				text: "Paragraph1",
				number: 1,
				textAndOccurrenceHash: expect.any(String),
			},
			{
				text: "Paragraph2",
				number: 2,
				textAndOccurrenceHash: expect.any(String),
			},
		]);
	});

	it("同じテキストが複数回出てもhashが異なる", async () => {
		const md = "# Title\n\nSame\n\nSame";
		const file = await processSegments(md, "Title");
		const sameSegs = (file.data.segments as SegmentDraft[]).filter(
			(s: SegmentDraft) => s.text === "Same",
		);
		expect(sameSegs.length).toBe(2);
		expect(sameSegs[0].textAndOccurrenceHash).not.toBe(
			sameSegs[1].textAndOccurrenceHash,
		);
	});

	it("タイトルと本文で同じテキストでもhashが異なる", async () => {
		const md = "# Title\n\nTitle";
		const file = await processSegments(md, "Title");
		const titleSegs = (file.data.segments as SegmentDraft[]).filter(
			(s: SegmentDraft) => s.text === "Title",
		);
		expect(titleSegs.length).toBe(3); // header, heading, paragraph
		expect(
			new Set(titleSegs.map((s: SegmentDraft) => s.textAndOccurrenceHash)).size,
		).toBe(3);
	});

	it("編集して入れ替わってもsegmentsはhashが維持される", async () => {
		const md1 = "A\n\nB\n\nC";
		const file1 = await processSegments(md1);
		const map1 = new Map(
			(file1.data.segments as SegmentDraft[]).map((s: SegmentDraft) => [
				s.text,
				s.textAndOccurrenceHash,
			]),
		);
		const md2 = "A\n\nC\n\nB";
		const file2 = await processSegments(md2);
		const map2 = new Map(
			(file2.data.segments as SegmentDraft[]).map((s: SegmentDraft) => [
				s.text,
				s.textAndOccurrenceHash,
			]),
		);
		for (const [text, textAndOccurrenceHash] of map1.entries()) {
			expect(map2.get(text)).toBe(textAndOccurrenceHash);
		}
		expect((file2.data.segments as SegmentDraft[]).length).toBe(
			(file1.data.segments as SegmentDraft[]).length,
		);
	});

	it("リストやblockquoteもsegments化される", async () => {
		const md = "- item1\n- item2\n\n> quote";
		const file = await processSegments(md);
		const texts = (file.data.segments as SegmentDraft[]).map(
			(s: SegmentDraft) => s.text,
		);
		expect(texts).toEqual(["item1", "item2", "quote"]);
	});

	it("---(hr)やcode block, 空行はsegments化されない", async () => {
		const md = "A\n\n---\n\nB\n\n    code block\n\nC\n\n\n";
		const file = await processSegments(md);
		const texts = (file.data.segments as SegmentDraft[]).map(
			(s: SegmentDraft) => s.text,
		);
		expect(texts).toContain("A");
		expect(texts).toContain("B");
		expect(texts).toContain("C");
		expect(texts.some((t: string) => t.includes("code block"))).toBe(false);
		expect(texts.some((t: string) => t.includes("---"))).toBe(false);
	});

	it("imgはsegments化されない", async () => {
		const md = "A\n\n![alt](image.png)\n\nB";
		const file = await processSegments(md);
		const texts = (file.data.segments as SegmentDraft[]).map(
			(s: SegmentDraft) => s.text,
		);
		expect(texts).toContain("A");
		expect(texts).toContain("B");
		// 画像altやURLがsegmentに含まれないこと
		expect(texts.some((t: string) => t.includes("image.png"))).toBe(false);
		// alt属性もsegmentに含まれないこと（includeImageAlt: falseの効果）
		expect(texts.some((t: string) => t.includes("alt"))).toBe(false);
	});

	it("段落内の画像alt属性は翻訳対象にならない", async () => {
		const md = "Text with ![important description](image.jpg) inline image.";
		const file = await processSegments(md);
		const texts = (file.data.segments as SegmentDraft[]).map(
			(s: SegmentDraft) => s.text,
		);
		// テキスト部分は含まれる
		expect(texts.some((t: string) => t.includes("Text with"))).toBe(true);
		expect(texts.some((t: string) => t.includes("inline image"))).toBe(true);
		// alt属性は含まれない（includeImageAlt: falseの効果）
		expect(texts.some((t: string) => t.includes("important description"))).toBe(
			false,
		);
		// 画像URLも含まれない
		expect(texts.some((t: string) => t.includes("image.jpg"))).toBe(false);
	});

	it("{para:n} 記号は段落番号として保存され、本文からは除去される", async () => {
		const md = "{para:3} Para text";
		const file = await processSegments(md);
		const segs = file.data.segments as SegmentDraft[];
		expect(segs[0]).toMatchObject({
			text: "Para text",
			sourceParagraphNumber: "3",
			sourceParagraphOccurrence: 1,
		});
		expect(String(file)).toContain("Para text");
		expect(String(file)).not.toContain("{para:3}");
	});

	it("bookと同じ段落番号の出現順を別々の位置として保存する", async () => {
		const md =
			"<!--book:an2-->\n\n### 1. Chapter\n\n{para:1} A\n\n{para:1} B\n\n### 2. Chapter\n\n{para:1} C\n\n<!--book:an3-->\n\n### 1. Chapter\n\n{para:1} D";
		const file = await processSegments(md);
		const paraSegs = file.data.segments.filter(
			(segment) => segment.sourceParagraphNumber,
		);
		expect(
			paraSegs.map((segment) => ({
				book: segment.sourceBookCode,
				chapter: segment.sourceChapterNumber,
				paragraph: segment.sourceParagraphNumber,
				occurrence: segment.sourceParagraphOccurrence,
			})),
		).toEqual([
			{ book: "an2", chapter: 1, paragraph: "1", occurrence: 1 },
			{ book: "an2", chapter: 1, paragraph: "1", occurrence: 2 },
			{ book: "an2", chapter: 2, paragraph: "1", occurrence: 3 },
			{ book: "an3", chapter: 1, paragraph: "1", occurrence: 1 },
		]);
	});

	it("book見出しが無くても段落番号と出現順を保存する", async () => {
		const md = "{para:1} A\n\n{para:2} B";
		const file = await processSegments(md);
		const paraSegs = file.data.segments.filter(
			(segment) => segment.sourceParagraphNumber,
		);
		expect(
			paraSegs.map((segment) => [
				segment.sourceParagraphNumber,
				segment.sourceParagraphOccurrence,
			]),
		).toEqual([
			["1", 1],
			["2", 1],
		]);
	});
});
