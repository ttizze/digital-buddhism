import { describe, expect, it } from "vite-plus/test";
import { extractTipitakaPageTree } from "./extract-tipitaka-page-tree";

describe("extractTipitakaPageTree", () => {
	it("DB行を親子関係とpositionに従ってTipiṭakaツリーにする", () => {
		const rows = [
			{
				id: 3,
				position: 2,
				parentId: 1,
				slug: "sutta-pitaka",
				titleSegmentId: 30,
				titleText: "Suttapiṭaka",
				titleTranslationText: null,
			},
			{
				id: 4,
				position: 1,
				parentId: 2,
				slug: "parajika",
				titleSegmentId: 40,
				titleText: "Pārājika",
				titleTranslationText: null,
			},
			{
				id: 2,
				position: 1,
				parentId: 1,
				slug: "vinaya-pitaka",
				titleSegmentId: 20,
				titleText: "Vinayapiṭaka",
				titleTranslationText: null,
			},
		];

		expect(extractTipitakaPageTree(rows, 1)).toMatchObject([
			{
				id: 2,
				children: [{ id: 4 }],
			},
			{ id: 3, children: [] },
		]);
	});
});
