import { queryByAttribute } from "@testing-library/dom";
import { render, screen } from "@testing-library/react";
import type { Root } from "mdast";
import { IntlProvider } from "use-intl";
import { describe, expect, it, vi } from "vite-plus/test";
import { SegmentGlossVoteProvider } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/segment-glosses/vote-context";
import type { SegmentForDetail } from "@/app/[locale]/types";
import enMessages from "../../../../../../../../messages/en.json";
import {
	buildPageContentView,
	parsePageContentBody,
} from "../../_domain/page-content-view";
import { contentViewToReact } from "./index";

const segments: SegmentForDetail[] = Array.from({ length: 5 }, (_, index) => ({
	id: index + 1,
	pageId: 1,
	number: index + 1,
	text: "",
	translationText: null,
	textLevel: "MULA",
	annotations: [],
}));

function buildView(mdastJson: Root, pageSegments = segments) {
	const view = buildPageContentView({
		pageDetail: {
			id: 1,
			slug: "test",
			title: "Test",
			textLevel: "MULA",
			parentId: null,
			position: 0,
			mdastJson,
			segments: pageSegments,
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
	return { nodes, view };
}

describe("content view", () => {
	it("MDASTとsegmentを単一の描画データへ変換する", () => {
		const mdastJson: Root = {
			type: "root",
			children: [
				{
					type: "paragraph",
					data: { hProperties: { "data-number-id": "1" } },
					children: [{ type: "text", value: "same text" }],
				},
			],
		};
		const { nodes, view } = buildView(mdastJson, [
			{ ...segments[0]!, text: "same text" },
		]);
		const node = nodes[0];

		expect(view.pageDetail).not.toHaveProperty("mdastJson");
		expect(view.pageDetail).not.toHaveProperty("segments");
		expect(Array.isArray(node)).toBe(true);
		if (!Array.isArray(node)) throw new Error("Expected an element node");
		expect(node[2]).toHaveLength(4);
		expect(node[1]).toEqual(["same text"]);
	});

	it("セグメントの原文とユーザー翻訳を描画する", () => {
		const mdastJson: Root = {
			type: "root",
			children: [
				{
					type: "heading",
					depth: 1,
					data: { hProperties: { "data-number-id": "1" } },
					children: [{ type: "text", value: "abc" }],
				},
				{
					type: "paragraph",
					data: { hProperties: { "data-number-id": "2" } },
					children: [{ type: "text", value: "def" }],
				},
			],
		};
		const { nodes } = buildView(
			mdastJson,
			segments.map((segment) =>
				segment.number === 2
					? { ...segment, translationText: "translated" }
					: segment,
			),
		);
		render(contentViewToReact({ nodes, pageId: 1 }));

		expect(screen.getByText("abc")).toBeInTheDocument();
		expect(screen.getByText("def")).toBeInTheDocument();
		expect(screen.getByText("translated")).toHaveAttribute(
			"data-segment-id",
			"2",
		);
	});

	it("Tipitakaで使う見出し・段落・強調・リストを描画する", () => {
		const mdastJson: Root = {
			type: "root",
			children: [
				{
					type: "heading",
					depth: 1,
					data: { hProperties: { "data-number-id": "1" } },
					children: [{ type: "text", value: "Heading 1" }],
				},
				{
					type: "heading",
					depth: 2,
					data: { hProperties: { "data-number-id": "2" } },
					children: [{ type: "text", value: "Heading 2" }],
				},
				{
					type: "paragraph",
					data: {
						hProperties: { class: "gatha1", "data-number-id": "3" },
					},
					children: [
						{ type: "text", value: "Paragraph " },
						{
							type: "strong",
							children: [{ type: "text", value: "text" }],
						},
					],
				},
				{
					type: "list",
					ordered: true,
					children: [
						{
							type: "listItem",
							children: [
								{
									type: "paragraph",
									data: { hProperties: { "data-number-id": "4" } },
									children: [{ type: "text", value: "List item" }],
								},
							],
						},
					],
				},
			],
		};
		const { nodes } = buildView(mdastJson);
		const { container } = render(contentViewToReact({ nodes, pageId: 1 }));

		const getByDataNumberId = (id: number | string) =>
			queryByAttribute("data-number-id", container, id.toString());
		for (const number of [1, 2, 3, 4]) {
			expect(getByDataNumberId(number)).toBeInTheDocument();
		}
		expect(
			container.querySelector('h1[data-number-id="1"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('h2[data-number-id="2"]'),
		).toBeInTheDocument();
		expect(container.querySelector('p[data-number-id="3"]')).toHaveClass(
			"gatha1",
		);
		expect(
			container.querySelector('p[data-number-id="3"] strong'),
		).toHaveTextContent("text");
		expect(
			container.querySelector('ol li[data-number-id="4"]'),
		).toBeInTheDocument();
	});

	it("note・pb・bookマーカーを画面に描画しない", () => {
		const mdastJson: Root = {
			type: "root",
			children: [
				{ type: "html", value: "<!--book:dn1-->" },
				{
					type: "paragraph",
					children: [
						{ type: "text", value: "before" },
						{ type: "html", value: '<span class="note">hidden</span>' },
						{
							type: "html",
							value: '<span class="pb" data-ed="V" data-n="1"></span>',
						},
						{ type: "text", value: "after" },
					],
				},
			],
		};
		const { nodes } = buildView(mdastJson);
		const { container } = render(contentViewToReact({ nodes, pageId: 1 }));

		expect(container).toHaveTextContent("beforeafter");
		expect(container).not.toHaveTextContent("hidden");
		expect(container.querySelector(".note, .pb")).toBeNull();
	});

	it("翻訳・遅延取得した注釈・語義投票のDOM契約を維持する", () => {
		const sourceText = "Karaṇīyam atthakusalena";
		const mdastJson: Root = {
			type: "root",
			children: [
				{
					type: "paragraph",
					data: { hProperties: { "data-number-id": "1" } },
					children: [{ type: "text", value: sourceText }],
				},
			],
		};
		const { nodes } = buildView(mdastJson, [
			{ ...segments[0]!, text: sourceText, translationText: "to be done" },
		]);
		const annotations: SegmentForDetail["annotations"] = [
			{
				annotationSegment: {
					id: 200,
					pageId: 2,
					number: 1,
					text: "commentary",
					translationText: "annotation",
					textLevel: "ATTHAKATHA",
				},
			},
		];
		const glossUnits = [
			{
				id: 101,
				segmentId: 1,
				position: 0,
				startOffset: 0,
				endOffset: 9,
				surface: "Karaṇīyam",
				gloss: "to be done",
				point: 3,
				currentUserVoteIsUpvote: null,
			},
		];
		const glossUnitsBySegment = new Map([[1, glossUnits]]);
		const { container } = render(
			<IntlProvider locale="en" messages={enMessages}>
				<SegmentGlossVoteProvider locale="en" mutate={vi.fn()}>
					{contentViewToReact({
						nodes,
						pageId: 1,
						annotations: { "1": annotations },
						glossUnitsBySegment,
					})}
				</SegmentGlossVoteProvider>
			</IntlProvider>,
		);

		expect(container.querySelector(".seg-tr")).toHaveAttribute(
			"data-segment-id",
			"1",
		);
		expect(container.querySelector(".seg-tr")).toHaveTextContent("to be done");
		expect(
			container.querySelector('[data-annotation-type="Atthakatha"].seg-ann'),
		).toHaveTextContent("commentary");
		expect(
			container.querySelector('[data-gloss-unit-id="101"]'),
		).toBeInTheDocument();
	});
});
