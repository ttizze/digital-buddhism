import GithubSlugger from "github-slugger";
import type { Heading, Root, RootContent } from "mdast";
import { describe, expect, it } from "vite-plus/test";
import type { SegmentForDetail } from "@/app/[locale]/types";
import { extractTocItems } from "./extract-toc-items";
import {
	buildPageContentView,
	parsePageContentBody,
} from "./page-content-view";

const headingNode = (
	number: number | null,
	depth: Heading["depth"],
): Heading => ({
	type: "heading",
	depth,
	data:
		number !== null
			? { hProperties: { "data-number-id": number.toString() } }
			: undefined,
	children: [{ type: "text", value: `Heading ${number ?? "?"}` }],
});

const root = (children: RootContent[]): Root => ({
	type: "root",
	children,
});

const createSegment = (
	number: number,
	text: string,
	translatedText: string | null = null,
): SegmentForDetail => ({
	id: number,
	pageId: 1,
	number,
	text,
	translationText: translatedText,
	textLevel: "MULA",
	annotations: [],
});

function extractFrom(mdast: Root, segments: SegmentForDetail[]) {
	const view = buildPageContentView({
		pageDetail: {
			id: 1,
			slug: "test",
			title: "Test",
			textLevel: "MULA",
			parentId: null,
			position: 0,
			mdastJson: mdast,
			segments,
			createdAt: new Date(0),
			updatedAt: new Date(0),
		},
		navigationData: null,
		childPages: [],
		completedTranslationLocales: [],
		description: "",
		annotationTypes: [],
	});
	const [, nodes] = parsePageContentBody(view.body);
	return extractTocItems({ nodes, pageId: 1 });
}

describe("extractTocItems", () => {
	it("深さ1-4の見出しだけを順序通りに抽出する", () => {
		const slugger = new GithubSlugger();
		const mdast = root([
			headingNode(1, 1),
			headingNode(2, 2),
			headingNode(3, 4),
			headingNode(4, 5),
		]);
		const segments = [
			createSegment(1, "Heading 1"),
			createSegment(2, "Heading 2"),
			createSegment(3, "Heading 3"),
			createSegment(4, "Heading 4"),
		];

		const result = extractFrom(mdast, segments);

		expect(result).toEqual([
			{
				anchorId: slugger.slug("Heading 1"),
				level: 1,
				segment: {
					id: 1,
					pageId: 1,
					number: 1,
					text: "Heading 1",
					translationText: null,
				},
			},
			{
				anchorId: slugger.slug("Heading 2"),
				level: 2,
				segment: {
					id: 2,
					pageId: 1,
					number: 2,
					text: "Heading 2",
					translationText: null,
				},
			},
			{
				anchorId: slugger.slug("Heading 3"),
				level: 4,
				segment: {
					id: 3,
					pageId: 1,
					number: 3,
					text: "Heading 3",
					translationText: null,
				},
			},
		]);
	});

	it("data-number-idが欠ける/未登録の見出しは無視する", () => {
		const mdast = root([headingNode(null, 1), headingNode(9, 2)]);
		const segments = [createSegment(1, "Heading 1")];

		const result = extractFrom(mdast, segments);

		expect(result).toEqual([]);
	});

	it("空文字の見出しテキストは無視する", () => {
		const mdast = root([headingNode(1, 1)]);
		const segments = [createSegment(1, "   ")];

		const result = extractFrom(mdast, segments);

		expect(result).toEqual([]);
	});

	it("目次対象外の同名見出しも本文と同じslug採番を消費する", () => {
		const mdast = root([headingNode(1, 5), headingNode(2, 2)]);
		const segments = [
			createSegment(1, "Repeated"),
			createSegment(2, "Repeated"),
		];

		const result = extractFrom(mdast, segments);

		expect(result).toHaveLength(1);
		expect(result[0]?.anchorId).toBe("repeated-1");
	});
});
