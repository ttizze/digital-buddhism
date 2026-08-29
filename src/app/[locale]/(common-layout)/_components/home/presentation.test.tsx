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
		expect(screen.queryByTestId("about-section")).not.toBeInTheDocument();
		expect(screen.queryByTestId("floating-controls")).not.toBeInTheDocument();
		expect(screen.queryByTestId("new-pages")).not.toBeInTheDocument();
		expect(screen.queryByTestId("popular-pages")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: /More/ }),
		).not.toBeInTheDocument();
	});
});

describe("ホーム画面のメタデータ", () => {
	it("ロケール別の文言とルートのcanonical alternateを返す", () => {
		const metadata = getHomeMetadata("ja");

		expect(metadata.title).toBe("Evame — 言葉の壁がないインターネット");
		expect(metadata.description).toContain("母国語で書く。世界が読む。");
		expect(metadata.alternates.canonical).toMatch(/\/ja$/);
		expect(metadata.alternates.languages["x-default"]).toMatch(/\/en$/);
	});
});
