import * as fs from "node:fs";
import * as path from "node:path";
import type { Element } from "@xmldom/xmldom";
import {
	BLOCK_TYPES,
	GATHA_BLOCK_TYPES,
} from "../../src/app/[locale]/_domain/custom-block-types";
import {
	getChildElements,
	normalizeTagName,
	renderInlineChildren,
	renderInlineElementToString,
} from "./tei";
import type { BookDoc, SiteTocEntry } from "./types";

const REND_HEADING_LEVELS = new Map([
	["nikaya", 1],
	["book", 2],
	["chapter", 3],
	["title", 4],
	["subhead", 4],
	["subsubhead", 4],
]);

const GATHA_RENDS = new Set<string>(GATHA_BLOCK_TYPES);
const BLOCK_RENDS = new Set<string>(BLOCK_TYPES);

function renderHeading(element: Element, level: number): string {
	const safeLevel = Math.min(Math.max(level, 1), 6);
	const content = renderInlineChildren(element).trim();
	const prefix = "#".repeat(safeLevel);
	return content ? `${prefix} ${content}` : prefix;
}

function collapseBlankLines(lines: string[]): string[] {
	const result: string[] = [];
	for (const line of lines) {
		const isBlank = line.trim().length === 0;
		if (isBlank) {
			if (
				result.length === 0 ||
				result[result.length - 1].trim().length === 0
			) {
				continue;
			}
			result.push("");
			continue;
		}
		result.push(line);
	}
	while (result.length > 0 && result[0].trim().length === 0) result.shift();
	while (result.length > 0 && result[result.length - 1].trim().length === 0)
		result.pop();
	return result;
}

function renderParagraph(node: Element): string[] {
	const rend = (node.getAttribute("rend") ?? "").toLowerCase();
	const n = node.getAttribute("n");

	// 見出しとして扱うrend属性の場合
	const headingLevel = REND_HEADING_LEVELS.get(rend);
	if (headingLevel !== undefined) {
		return [renderHeading(node, headingLevel)];
	}

	// 偈（詩）として扱うrend属性の場合
	if (rend && GATHA_RENDS.has(rend)) {
		const content = renderInlineChildren(node).trim();
		// ガーターは特殊記法で出力（::gatha1\n...\n::）
		if (!content) return [""];
		return [`::${rend}\n${content}\n::`];
	}

	// ブロック形式のrend属性（indent, unindented, centre）
	if (rend && BLOCK_RENDS.has(rend)) {
		const content = renderInlineChildren(node).trim();
		if (!content) return [""];
		return [`::${rend}\n${content}\n::`];
	}

	// hangnum: ハンギング番号（番号だけの独立した段落）
	if (rend === "hangnum") {
		let content = renderInlineChildren(node).trim();
		// paranumの処理で追加されたエスケープ記号を削除
		content = content.replace(/\\$/, "");
		if (!content) return [""];
		const paragraphNotation = n ? `{para:${n}} ` : "";
		return [`::hangnum\n${paragraphNotation}${content}\n::`];
	}

	// 通常の段落として処理（rend属性がない場合、またはbodytextの場合）
	// すべてのrend属性は上記で処理済みなので、ここに到達するのはrend属性がない場合のみ
	const content = renderInlineChildren(node).trim();
	// 段落番号がある場合は {para:n} 形式で先頭に追加
	if (n && content) {
		return [`{para:${n}} ${content}`];
	}
	return [content];
}

function renderDiv(node: Element): string[] {
	const children = getChildElements(node);
	const results: string[] = [];
	const type = (node.getAttribute("type") ?? "").toLowerCase();
	const bookCode = node.getAttribute("id") ?? node.getAttribute("n");

	if (type === "book" && bookCode && /^[A-Za-z0-9._-]+$/.test(bookCode)) {
		results.push(`<!--book:${bookCode}-->`);
	}
	for (const child of children) {
		results.push(...renderBlockElement(child));
	}

	return results;
}

function renderBlockElement(node: Element): string[] {
	const tag = normalizeTagName(node.tagName);
	const rend = (node.getAttribute("rend") ?? "").toLowerCase();

	switch (tag) {
		case "div":
			return renderDiv(node);
		case "head": {
			const level = REND_HEADING_LEVELS.get(rend) ?? 3;
			return [renderHeading(node, level)];
		}
		case "p":
			return renderParagraph(node);
		case "trailer": {
			// trailerは通常centre（中央揃え）で表示
			const content = renderInlineChildren(node).trim();
			return content ? [`::centre\n${content}\n::`] : [""];
		}
		default:
			return [renderInlineElementToString(node)];
	}
}

function ensureBookOutputDirectory(doc: BookDoc, outputDir: string): string {
	const baseDir = path.join(outputDir, ...doc.dirSegments);
	fs.mkdirSync(baseDir, { recursive: true });
	return baseDir;
}

export function renderBookMarkdown(doc: BookDoc): string {
	const content = doc.nodes.flatMap((node) => renderBlockElement(node));
	const lines = collapseBlankLines(content);
	return `${lines.join("\n\n").trim()}\n`;
}

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const BOOK_MARKER_PATTERN = /^<!--book:[A-Za-z0-9._-]+-->$/;

function normalizeTitle(value: string): string {
	return value
		.replace(/\{note:[^}]*}/g, "")
		.replace(/\{pb:[^}]*}/g, "")
		.replace(/[*_]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function findTitleLine(
	lines: string[],
	title: string,
	startIndex: number,
	chapterOnly: boolean,
): number {
	const normalizedTitle = normalizeTitle(title);
	for (let index = startIndex; index < lines.length; index += 1) {
		const match = lines[index]?.match(HEADING_PATTERN);
		if (!match || (chapterOnly && match[1] !== "###")) continue;
		if (normalizeTitle(match[2]) === normalizedTitle) return index;
	}
	return -1;
}

function chapterNumberAt(lines: string[], lineIndex: number): number {
	let chapterNumber = 0;
	for (let index = 0; index <= lineIndex; index += 1) {
		if (lines[index]?.startsWith("### ")) chapterNumber += 1;
	}
	return chapterNumber;
}

function activeBookMarker(lines: string[], lineIndex: number): string | null {
	for (let index = lineIndex - 1; index >= 0; index -= 1) {
		const line = lines[index];
		if (line && BOOK_MARKER_PATTERN.test(line)) return line;
	}
	return null;
}

export function splitBookMarkdownBySiteToc(
	markdown: string,
	tocEntries: SiteTocEntry[],
): Array<SiteTocEntry & { markdown: string }> {
	if (tocEntries.length === 0) {
		throw new Error("Tipitaka.org TOC has no entries");
	}

	const lines = markdown.trim().split("\n");
	const titleLineIndexes: number[] = [];
	let searchFrom = 0;
	for (const [index, entry] of tocEntries.entries()) {
		const titleLineIndex = findTitleLine(
			lines,
			entry.title,
			searchFrom,
			index > 0,
		);
		if (index > 0 && titleLineIndex < 0) {
			throw new Error(`Tipitaka.org TOC boundary not found: ${entry.title}`);
		}
		titleLineIndexes.push(titleLineIndex);
		if (titleLineIndex >= 0) searchFrom = titleLineIndex + 1;
	}

	return tocEntries.map((entry, index) => {
		const startIndex = index === 0 ? 0 : titleLineIndexes[index];
		const endIndex = titleLineIndexes[index + 1] ?? lines.length;
		if (startIndex === undefined || startIndex < 0 || endIndex < startIndex) {
			throw new Error(`Invalid Tipitaka.org TOC order: ${entry.title}`);
		}

		const partLines = lines.slice(startIndex, endIndex);
		const titleLineIndex = titleLineIndexes[index] ?? -1;
		if (titleLineIndex >= startIndex && titleLineIndex < endIndex) {
			const relativeTitleIndex = titleLineIndex - startIndex;
			const titleLine = partLines[relativeTitleIndex] ?? "";
			partLines[relativeTitleIndex] = titleLine.startsWith("### ")
				? `<!--chapter:${chapterNumberAt(lines, titleLineIndex)}-->`
				: "";
		}

		const marker = startIndex > 0 ? activeBookMarker(lines, startIndex) : null;
		const body = collapseBlankLines([
			...(marker ? [marker, ""] : []),
			...partLines,
		]);
		return {
			...entry,
			markdown: `# ${entry.title}\n\n${body.join("\n").trim()}\n`,
		};
	});
}

export function writeBookMarkdown(
	doc: BookDoc,
	outputDir: string,
	tocEntries: SiteTocEntry[],
): void {
	const bookDir = ensureBookOutputDirectory(doc, outputDir);
	const markdown = renderBookMarkdown(doc);

	for (const part of splitBookMarkdownBySiteToc(markdown, tocEntries)) {
		fs.writeFileSync(
			path.join(bookDir, part.outputFileName),
			part.markdown,
			"utf8",
		);
	}
}
