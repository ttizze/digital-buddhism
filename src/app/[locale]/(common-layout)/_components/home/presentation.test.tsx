import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getHomeMetadata } from "./metadata";

vi.mock("../tipitaka-page-list/tipitaka-page-list", () => ({
	TipitakaPageList: () => (
		<section data-testid="tipitaka-pages">Tipiṭaka</section>
	),
}));

import { HomePresentation } from "./presentation";

const data: Parameters<typeof HomePresentation>[0]["data"] = {
	tipitakaPages: [],
};

describe("ホーム画面", () => {
	it("Tipitakaだけを表示し非表示セクションを含めない", () => {
		const { container } = render(<HomePresentation data={data} locale="en" />);

		expect(
			[...container.querySelectorAll("[data-testid]")].map((element) =>
				element.getAttribute("data-testid"),
			),
		).toEqual(["tipitaka-pages"]);
		expect(screen.getByTestId("tipitaka-pages")).toBeInTheDocument();
	});
});

describe("ホーム画面のメタデータ", () => {
	it("ロケール別の文言とTipitaka rootのcanonical alternateを返す", () => {
		const metadata = getHomeMetadata("ja");

		expect(metadata.title).toBe("Tipiṭaka — パーリ仏典を読む・翻訳する");
		expect(metadata.description).toContain("パーリ仏典Tipiṭaka");
		expect(metadata.alternates.canonical).toMatch(/\/ja\/tipitaka$/);
		expect(metadata.alternates.languages["x-default"]).toMatch(
			/\/en\/tipitaka$/,
		);
	});
});
