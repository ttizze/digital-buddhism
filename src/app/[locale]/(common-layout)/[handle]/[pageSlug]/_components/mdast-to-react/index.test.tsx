import { queryByAttribute } from "@testing-library/dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Segment } from "@/app/[locale]/types";
import type { JsonValue } from "@/drizzle/types";

// 2. その後で被テストモジュールをimport
import { mdastToReact } from "./index";

// テスト用のセグメントバンドル
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
	it("renders segments correctly", async () => {
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

		const el = await mdastToReact({
			mdast: mdast,
			segments,
		});
		render(el);

		// セグメントが正しくレンダリングされているか確認
		expect(screen.getByText("abc")).toBeInTheDocument();
		expect(screen.getByText("def")).toBeInTheDocument();
	});

	it("外部URLを埋め込みに変換せずリンクとして描画する", async () => {
		const mdast: JsonValue = {
			type: "root",
			children: [
				{
					type: "paragraph",
					children: [
						{
							type: "link",
							url: "https://x.com/user/status/9876543210",
							children: [{ type: "text", value: "X post" }],
						},
					],
				},
				{
					type: "paragraph",
					children: [
						{
							type: "link",
							url: "https://example.com/article",
							children: [{ type: "text", value: "Article" }],
						},
					],
				},
			],
		};

		const el = await mdastToReact({ mdast, segments });
		render(el);

		expect(screen.getByText("X post").closest("a")).toHaveAttribute(
			"href",
			"https://x.com/user/status/9876543210",
		);
		expect(screen.getByText("Article").closest("a")).toHaveAttribute(
			"href",
			"https://example.com/article",
		);
	});
	it("renders different HTML elements correctly", async () => {
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
					data: { hProperties: { "data-number-id": "3" } },
					children: [{ type: "text", value: "Paragraph text" }],
				},
				{
					type: "list",
					ordered: true,
					children: [
						{
							type: "listItem",
							data: { hProperties: { "data-number-id": "4" } }, // ★ここ
							children: [
								{
									type: "paragraph",
									children: [{ type: "text", value: "List item" }],
								},
							],
						},
					],
				},
				{
					type: "blockquote",
					data: { hProperties: { "data-number-id": "5" } },
					children: [
						{
							type: "paragraph",
							children: [{ type: "text", value: "Blockquote text" }],
						},
					],
				},
			],
		};

		const el = await mdastToReact({
			mdast: mdast,
			segments,
		});
		const { container } = render(el);

		const getByDataNumberId = (container: HTMLElement, id: number | string) =>
			queryByAttribute("data-number-id", container, id.toString());
		/* セグメントが存在するか */
		for (const n of [1, 2, 3, 4, 5]) {
			expect(getByDataNumberId(container, n)).toBeInTheDocument();
		}

		/* タグが正しいか */
		expect(
			container.querySelector('h1[data-number-id="1"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('h2[data-number-id="2"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('p[data-number-id="3"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('li[data-number-id="4"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('blockquote[data-number-id="5"]'),
		).toBeInTheDocument();
		expect(
			container.querySelector('ol li[data-number-id="4"]'),
		).toBeInTheDocument();
	});
});
