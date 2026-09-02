import { queryByAttribute } from "@testing-library/dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Segment } from "@/app/[locale]/types";
import type { JsonValue } from "@/drizzle/types";

import { mdastToReact } from "./index";

const segments: Segment[] = Array.from(
	{ length: 5 },
	(_, i) =>
		({
			id: i + 1,
			pageId: 1,
			number: i + 1,
			text: "",
			translationText: null,
		}) as Segment,
);

describe("mdastToReact", () => {
	it("セグメントの原文とユーザー翻訳を描画する", () => {
		const mdast: JsonValue = {
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

		const el = mdastToReact({
			mdast,
			segments: segments.map((segment) =>
				segment.number === 2
					? { ...segment, translationText: "translated" }
					: segment,
			),
		});
		render(el);

		expect(screen.getByText("abc")).toBeInTheDocument();
		expect(screen.getByText("def")).toBeInTheDocument();
		expect(screen.getByText("translated")).toHaveAttribute(
			"data-segment-id",
			"2",
		);
	});

	it("Tipitakaで使う見出し・段落・強調・リストを描画する", () => {
		const mdast: JsonValue = {
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

		const el = mdastToReact({
			mdast,
			segments,
		});
		const { container } = render(el);

		const getByDataNumberId = (container: HTMLElement, id: number | string) =>
			queryByAttribute("data-number-id", container, id.toString());
		for (const n of [1, 2, 3, 4]) {
			expect(getByDataNumberId(container, n)).toBeInTheDocument();
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
			container.querySelector('li[data-number-id="4"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('ol li[data-number-id="4"]'),
		).toBeInTheDocument();
	});

	it("note・pb・bookマーカーを画面に描画しない", () => {
		const mdast: JsonValue = {
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

		const { container } = render(mdastToReact({ mdast, segments }));

		expect(container).toHaveTextContent("beforeafter");
		expect(container).not.toHaveTextContent("hidden");
		expect(container.querySelector(".note, .pb")).toBeNull();
	});
});
