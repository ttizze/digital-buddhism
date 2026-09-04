/**
 * remark プラグイン: MDAST からセグメントを生成し、安定ハッシュ/番号/メタデータを付与する。
 * - header があれば 0 番のセグメントとして先頭に追加
 * - ブロック要素（段落/見出し/リスト項目/引用）を 1 セグメントとして抽出（ネストは除外）
 * - {para:n} を paragraphNumber に、<span class="pb" ...> を metadata.items に格納
 * - 同一テキストでも出現回数込みで一意なハッシュを生成
 * - ノードには HTML 変換用の data-number-id を付与
 * 備考: locale はここでは扱わない
 */

import type {
	Blockquote,
	Heading,
	ListItem,
	Nodes,
	Paragraph,
	Root,
} from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import type { Segment } from "@/db/types.helpers";
import { generateHashForText } from "../_utils/generate-hash-for-text";
/* ---------- 共通型 ---------- */

export type SegmentDraft = Omit<
	Segment,
	| "id"
	| "tipitakaPageId"
	| "createdAt"
	| "sourceBookCode"
	| "sourceChapterNumber"
	| "sourceParagraphNumber"
	| "sourceParagraphOccurrence"
> & {
	metadata?: { items: Array<{ typeKey: string; value: string }> };
	sourceBookCode?: string;
	sourceChapterNumber?: number;
	sourceParagraphNumber?: string;
	sourceParagraphOccurrence?: number;
};

/* mdast で「1 ブロック」とみなすノード型 */
type BlockNode = Paragraph | Heading | ListItem | Blockquote;

const PARA_NOTATION_REGEX = /^\{para:([^}]+)\}\s*/;
const BOOK_MARKER_REGEX = /^<!--\s*book:([A-Za-z0-9._-]+)\s*-->$/;
const CHAPTER_MARKER_REGEX = /^<!--\s*chapter:(\d+)\s*-->$/;

const canonicalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

interface PageBreak {
	typeKey: string;
	value: string;
}

interface ParagraphText {
	paragraphNumber: string | null;
	cleanedText: string;
}

interface SegmentBuildResult {
	segment: SegmentDraft | null;
	updatedParagraphNumber: string | null;
	updatedParagraphOccurrence: number | null;
}

/* ---------- ヘルパー関数 ---------- */

function isBlockNode(node: Nodes): node is BlockNode {
	switch (node.type) {
		case "paragraph":
		case "heading":
		case "listItem":
		case "blockquote":
			return true;
		default:
			return false;
	}
}

function hasNestedBlock(node: BlockNode): boolean {
	return node.children.some((child) => isBlockNode(child));
}

function extractText(node: BlockNode): string {
	// pb/note の span はメタデータ・注記であり、翻訳対象テキストとハッシュには含めない
	return mdastToString(node, {
		includeImageAlt: false,
		includeHtml: false,
	}).trim();
}

const PB_SPAN_REGEX =
	/<span\s+class="pb"((?:\s+data-(?:ed|n|value)="[^"]*")*)\s*><\/span>/;
const PB_ATTRIBUTE_REGEX = /data-(ed|n|value)="([^"]*)"/g;

const PB_EDITION_MAP = new Map([
	["V", "VRI"],
	["VRI", "VRI"],
	["M", "MYANMAR"],
	["P", "PTS"],
	["T", "THAI"],
	["O", "OTHER"],
	["OTHER", "OTHER"],
]);

function parsePageBreak(html: string): PageBreak | null {
	const pbMatch = html.match(PB_SPAN_REGEX);
	if (!pbMatch) return null;

	const attributes = new Map<string, string>();
	for (const attribute of pbMatch[1].matchAll(PB_ATTRIBUTE_REGEX)) {
		attributes.set(attribute[1], attribute[2]);
	}

	// {pb:x} は版名かページ番号か曖昧な data-value になるため、既知の版名なら版として扱う
	const ambiguous = attributes.get("value");
	const ambiguousIsEdition =
		ambiguous !== undefined && PB_EDITION_MAP.has(ambiguous.toUpperCase());
	const edition =
		attributes.get("ed") ?? (ambiguousIsEdition ? ambiguous : undefined);
	const pageCode =
		attributes.get("n") ?? (ambiguousIsEdition ? undefined : ambiguous) ?? "";
	const normalizedEdition = edition
		? (PB_EDITION_MAP.get(edition.toUpperCase()) ?? edition.toUpperCase())
		: "OTHER";
	return { typeKey: `${normalizedEdition}_PAGEBREAK`, value: pageCode };
}

function extractPageBreaksFromNode(node: BlockNode): PageBreak[] {
	const pageBreaks: PageBreak[] = [];

	for (const child of node.children) {
		if (child.type === "html") {
			const pageBreak = parsePageBreak(child.value);
			if (pageBreak) pageBreaks.push(pageBreak);
		}
	}
	return pageBreaks;
}

function setNodeDataNumber(node: BlockNode, number: number): void {
	if (node.data === undefined) {
		node.data = {};
	}
	if (node.data.hProperties === undefined) {
		node.data.hProperties = {};
	}
	node.data.hProperties["data-number-id"] = number.toString();
}

function generateHashAndTrackOccurrence(
	text: string,
	occurrenceMap: Map<string, number>,
): string {
	const canonicalizedText = canonicalize(text);
	const occurrence = (occurrenceMap.get(canonicalizedText) ?? 0) + 1;
	occurrenceMap.set(canonicalizedText, occurrence);
	return generateHashForText(text, occurrence);
}

function stripParagraphNotationFromNode(node: BlockNode): void {
	const children = node.children;
	for (let i = 0; i < children.length; i += 1) {
		const child = children[i];
		if (child.type !== "text") continue;
		const newValue = child.value.replace(PARA_NOTATION_REGEX, "");
		if (newValue === child.value) {
			return;
		}
		if (newValue.length > 0) {
			child.value = newValue;
		} else {
			children.splice(i, 1);
		}
		return;
	}
}

/**
 * ブロックノードから段落番号を抽出し、テキストから削除する
 */
function extractParagraphNumber(text: string, node: BlockNode): ParagraphText {
	const paraMatch = text.match(PARA_NOTATION_REGEX);
	if (!paraMatch) {
		return { paragraphNumber: null, cleanedText: text };
	}

	let paragraphNumber = paraMatch[1];
	// 範囲形式（例：「1-5」）の場合は、最後の数字（5）を取得
	if (paragraphNumber.includes("-")) {
		const parts = paragraphNumber.split("-");
		paragraphNumber = parts[parts.length - 1];
	}

	stripParagraphNotationFromNode(node);
	const cleanedText = text.slice(paraMatch[0].length);

	return {
		paragraphNumber,
		cleanedText,
	};
}

/**
 * ブロックノードからセグメント情報を抽出してセグメントドラフトを作成する
 */
function createSegmentFromBlockNode(
	node: BlockNode,
	number: number,
	currentBookCode: string | null,
	currentChapterNumber: number | null,
	currentParagraphNumber: string | null,
	currentParagraphOccurrence: number | null,
	textOccurrenceMap: Map<string, number>,
	paragraphOccurrenceMap: Map<string, number>,
): SegmentBuildResult {
	if (hasNestedBlock(node)) {
		return {
			segment: null,
			updatedParagraphNumber: currentParagraphNumber,
			updatedParagraphOccurrence: currentParagraphOccurrence,
		};
	}

	let text = extractText(node);
	if (!text) {
		return {
			segment: null,
			updatedParagraphNumber: currentParagraphNumber,
			updatedParagraphOccurrence: currentParagraphOccurrence,
		};
	}

	const metadata: PageBreak[] = [];
	const isHeading = node.type === "heading";
	const { paragraphNumber: paragraphNumberFromBlock, cleanedText } =
		extractParagraphNumber(text, node);

	let updatedParagraphNumber = currentParagraphNumber;
	let updatedParagraphOccurrence = currentParagraphOccurrence;
	if (paragraphNumberFromBlock) {
		updatedParagraphNumber = paragraphNumberFromBlock;
		const occurrenceKey = `${currentBookCode ?? ""}\u0000${paragraphNumberFromBlock}`;
		updatedParagraphOccurrence =
			(paragraphOccurrenceMap.get(occurrenceKey) ?? 0) + 1;
		paragraphOccurrenceMap.set(occurrenceKey, updatedParagraphOccurrence);
	}

	metadata.push(...extractPageBreaksFromNode(node));
	text = cleanedText.trim();

	if (!text) {
		return {
			segment: null,
			updatedParagraphNumber,
			updatedParagraphOccurrence,
		};
	}

	const textAndOccurrenceHash = generateHashAndTrackOccurrence(
		text,
		textOccurrenceMap,
	);
	setNodeDataNumber(node, number);

	return {
		segment: {
			textAndOccurrenceHash,
			text,
			number,
			metadata: metadata.length > 0 ? { items: metadata } : undefined,
			sourceBookCode: currentBookCode ?? undefined,
			sourceChapterNumber: currentChapterNumber ?? undefined,
			sourceParagraphNumber:
				!isHeading && updatedParagraphNumber !== null
					? updatedParagraphNumber
					: undefined,
			sourceParagraphOccurrence:
				!isHeading && updatedParagraphOccurrence !== null
					? updatedParagraphOccurrence
					: undefined,
		},
		updatedParagraphNumber,
		updatedParagraphOccurrence,
	};
}

/* ---------- プラグイン本体 ---------- */

export const remarkHashAndSegments =
	(header?: string): Plugin<[], Root> =>
	() =>
	(tree: Root, file: VFile) => {
		const segments = (file.data.segments ??= []);

		const textOccurrenceMap = new Map<string, number>();
		const paragraphOccurrenceMap = new Map<string, number>();
		let number = 1;

		if (header?.trim()) {
			const textAndOccurrenceHash = generateHashForText(header, 0);
			segments.push({
				textAndOccurrenceHash,
				text: header,
				number: 0,
			});
			textOccurrenceMap.set(canonicalize(header), 0);
		}

		let currentBookCode: string | null = null;
		let currentChapterNumber: number | null = null;
		let currentParagraphNumber: string | null = null;
		let currentParagraphOccurrence: number | null = null;

		visit(tree, (node: Nodes) => {
			if (node.type === "html") {
				const value = node.value.trim();
				const bookMarker = value.match(BOOK_MARKER_REGEX);
				if (bookMarker) {
					currentBookCode = bookMarker[1] ?? null;
					currentChapterNumber = null;
					currentParagraphNumber = null;
					currentParagraphOccurrence = null;
					return;
				}
				const chapterMarker = value.match(CHAPTER_MARKER_REGEX);
				if (chapterMarker) {
					currentChapterNumber = Number.parseInt(chapterMarker[1] ?? "", 10);
					currentParagraphNumber = null;
					currentParagraphOccurrence = null;
				}
				return;
			}
			if (!isBlockNode(node)) return;

			if (node.type === "heading" && node.depth === 3) {
				currentChapterNumber = (currentChapterNumber ?? 0) + 1;
				currentParagraphNumber = null;
				currentParagraphOccurrence = null;
			}

			const { segment, updatedParagraphNumber, updatedParagraphOccurrence } =
				createSegmentFromBlockNode(
					node,
					number,
					currentBookCode,
					currentChapterNumber,
					currentParagraphNumber,
					currentParagraphOccurrence,
					textOccurrenceMap,
					paragraphOccurrenceMap,
				);
			if (!segment) return;

			currentParagraphNumber = updatedParagraphNumber;
			currentParagraphOccurrence = updatedParagraphOccurrence;
			segments.push(segment);
			number += 1;
		});
	};
