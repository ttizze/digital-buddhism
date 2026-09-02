import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { PageDetail } from "@/app/[locale]/types";

const {
	queryChildPagesTreeMock,
	queryCompletedTranslationLocalesMock,
	queryPageNavigationDataMock,
} = vi.hoisted(() => ({
	queryChildPagesTreeMock: vi.fn(),
	queryCompletedTranslationLocalesMock: vi.fn(),
	queryPageNavigationDataMock: vi.fn(),
}));

vi.mock("../_db/queries", () => ({
	queryChildPagesTree: queryChildPagesTreeMock,
	queryCompletedTranslationLocales: queryCompletedTranslationLocalesMock,
	queryPageNavigationData: queryPageNavigationDataMock,
}));

import { loadPageContentData } from "./load-page-content-data";

describe("loadPageContentData", () => {
	beforeEach(() => {
		queryChildPagesTreeMock.mockReset().mockResolvedValue([]);
		queryCompletedTranslationLocalesMock.mockReset().mockResolvedValue([]);
		queryPageNavigationDataMock.mockReset().mockResolvedValue(null);
	});

	it("外部リンクを含む本文でも読込中に外部通信しない", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValue(new Error("unexpected external request"));
		const pageDetail = {
			id: 1,
			slug: "article",
			title: "Article",
			textLevel: "MULA",
			parentId: null,
			position: 0,
			mdastJson: {
				type: "root",
				children: [
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
			},
			segments: [],
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		} satisfies PageDetail;

		try {
			await expect(
				loadPageContentData(pageDetail, "ja"),
			).resolves.toMatchObject({
				description: "Article",
				pageDetail,
			});
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
