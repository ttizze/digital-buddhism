import { render } from "@testing-library/react";
import { vi } from "vitest";
import { SegmentGlossVoteProvider } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/segment-glosses/vote-context";
import type { SegmentForDetail, TitleSegment } from "@/app/[locale]/types";
import { SegmentElement } from "./segment";

function makeListSegment(overrides: Partial<TitleSegment> = {}): TitleSegment {
	return {
		id: 1,
		pageId: 1,
		number: 1,
		text: "source",
		translationText: null,
		...overrides,
	};
}

function makeDetailSegment(
	overrides: Partial<SegmentForDetail> = {},
): SegmentForDetail {
	return {
		...makeListSegment(),
		textLevel: "MULA",
		annotations: [],
		...overrides,
	} as SegmentForDetail;
}

describe("SegmentElement", () => {
	test("interactive=true かつ訳文があるとき、訳文ブロックに data-segment-id が付く", () => {
		const { container } = render(
			<SegmentElement
				interactive={true}
				segment={makeDetailSegment({
					id: 10,
					translationText: "translation",
				})}
			/>,
		);

		expect(container.querySelector("button")).toBeNull();
		const tr = container.querySelector(".seg-tr");
		expect(tr).not.toBeNull();
		expect(tr).toHaveAttribute("data-segment-id", "10");
		expect(tr).toHaveAttribute("role", "button");
		expect(tr).toHaveAttribute("tabindex", "0");
		expect(tr).toHaveTextContent("translation");
	});

	test("interactive=false のとき、訳文に data-segment-id は付かない", () => {
		const { container } = render(
			<SegmentElement
				interactive={false}
				segment={makeListSegment({
					translationText: "translation",
				})}
			/>,
		);

		expect(container.querySelector("button")).toBeNull();
		expect(
			container.querySelector(".seg-tr")?.getAttribute("data-segment-id"),
		).toBeNull();
		expect(container).toHaveTextContent("translation");
	});

	test("ユーザー翻訳はHTMLとして解釈せず、改行を保持する", () => {
		const { container } = render(
			<SegmentElement
				segment={makeDetailSegment({
					translationText: "<strong>translation</strong>\nsecond line",
				})}
			/>,
		);

		const translation = container.querySelector(".seg-tr");
		expect(translation).toHaveTextContent(
			"<strong>translation</strong> second line",
		);
		expect(translation?.textContent).toBe(
			"<strong>translation</strong>\nsecond line",
		);
		expect(translation).toHaveClass("whitespace-pre-wrap");
		expect(translation?.querySelector("strong")).toBeNull();
	});

	test("注釈を持つとき、注釈は data-annotation-type 付きで描画される", () => {
		const { container } = render(
			<SegmentElement
				interactive={true}
				segment={makeDetailSegment({
					annotations: [
						{
							annotationSegment: makeDetailSegment({
								id: 200,
								number: 200,
								text: "ann-src",
								textLevel: "ATTHAKATHA",
								translationText: "ann-tr",
							}),
						},
					],
				})}
			/>,
		);

		expect(
			container.querySelector('[data-annotation-type="Atthakatha"].seg-ann'),
		).not.toBeNull();
		expect(
			container.querySelector(
				'[data-annotation-type="Atthakatha"].seg-ann.seg-tr[role="button"]',
			),
		).not.toBeNull();
		expect(container).toHaveTextContent("ann-src");
		expect(container).toHaveTextContent("ann-tr");
	});

	test("語義があっても既存の原文要素・インライン装飾・訳文を維持する", () => {
		const segment = makeDetailSegment({
			id: 10,
			text: "Karaṇīyam atthakusalena",
			translationText: "なすべきこと",
			glossUnits: [
				{
					id: 101,
					segmentId: 10,
					position: 0,
					startOffset: 0,
					endOffset: 9,
					surface: "Karaṇīyam",
					gloss: "なすべきこと",
					point: 3,
					currentUserVoteIsUpvote: null,
				},
			],
		});

		const { container } = render(
			<SegmentGlossVoteProvider locale="ja" mutate={vi.fn()}>
				<SegmentElement segment={segment}>
					<strong>Karaṇīyam</strong> atthakusalena
				</SegmentElement>
			</SegmentGlossVoteProvider>,
		);

		const source = container.querySelector(".seg-src");
		expect(source).toHaveTextContent("Karaṇīyam");
		expect(source).toHaveTextContent("atthakusalena");
		expect(source?.querySelector("strong button ruby rt")).toHaveTextContent(
			"なすべきこと",
		);
		expect(source?.querySelector("[data-gloss-unit-id='101']")).not.toBeNull();
		expect(container.querySelector(".seg-tr")).toHaveTextContent(
			"なすべきこと",
		);
	});

	test("語義のオフセットが原文と一致しない場合は原文を変更しない", () => {
		const segment = makeDetailSegment({
			text: "Karaṇīyam",
			glossUnits: [
				{
					id: 101,
					segmentId: 1,
					position: 0,
					startOffset: 0,
					endOffset: 4,
					surface: "wrong",
					gloss: "誤り",
					point: 0,
					currentUserVoteIsUpvote: null,
				},
			],
		});

		const { container } = render(
			<SegmentElement segment={segment}>Karaṇīyam</SegmentElement>,
		);

		expect(container.querySelector(".seg-src")).toHaveTextContent("Karaṇīyam");
		expect(container.querySelector("[data-gloss-unit-id]")).toBeNull();
	});
});
