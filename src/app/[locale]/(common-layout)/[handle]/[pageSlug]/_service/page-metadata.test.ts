import { describe, expect, it } from "vitest";
import { BASE_URL } from "@/app/_constants/base-url";
import type { PageDetail } from "@/app/[locale]/types";
import { buildPageMetadata } from "./page-metadata";

const pageDetail: PageDetail = {
	id: 1,
	slug: "vinaya-pitaka",
	title: "Vinayapiṭaka",
	textLevel: "MULA",
	parentId: 0,
	position: 1,
	mdastJson: { type: "root", children: [] },
	segments: [],
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("buildPageMetadata", () => {
	it("Tipitakaの固定ハンドルと表示ロケールでcanonical URLを作る", () => {
		const metadata = buildPageMetadata({
			completedTranslationLocales: [],
			description: "Tipiṭaka",
			locale: "ja",
			pageDetail,
		});

		expect(metadata.title).toBe("Vinayapiṭaka");
		expect(metadata.canonicalUrl).toBe(`${BASE_URL}/ja/tipitaka/vinaya-pitaka`);
		expect(metadata.openGraph.images[0]?.url).toBe(
			`${BASE_URL}/api/og?locale=ja&slug=vinaya-pitaka`,
		);
	});
});
