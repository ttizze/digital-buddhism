import { beforeEach, describe, expect, it } from "vitest";
import {
	countPublicPages,
	fetchTipitakaPagesWithTranslationsChunk,
} from "@/app/_db/sitemap-queries.server";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { generateRobotsResponse } from "./-seo-robots";
import {
	generateSitemapEntries,
	generateSitemapResponse,
	getSitemapChunkCount,
} from "./-seo-sitemap";
import { generateSitemapIndexResponse } from "./-seo-sitemap-index";

await setupDbPerFile(import.meta.url);

describe("TanStack StartのSEOルート生成", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("表示ページがなくてもサイトマップを1チャンクにする", async () => {
		expect(await getSitemapChunkCount()).toBe(1);
		expect(await (await generateRobotsResponse()).text()).toMatch(
			/\/sitemap\/sitemap\/0\.xml/,
		);
		expect(await (await generateSitemapIndexResponse()).text()).toMatch(
			/\/sitemap\/sitemap\/0\.xml/,
		);
	});

	it("非表示ページをチャンク数とサイトマップURLに含めない", async () => {
		const root = await createPage({ slug: "tipitaka", kind: "ROOT" });
		await createPage({
			slug: "hidden",
			parentId: root.id,
			isVisible: false,
		});

		expect(await countPublicPages()).toBe(1);
		const entries = await generateSitemapEntries(0);
		expect(entries.some((entry) => entry.url.includes("/hidden"))).toBe(false);
	});

	it("Tipitaka固定URLとXMLレスポンスを生成する", async () => {
		const root = await createPage({ slug: "tipitaka", kind: "ROOT" });
		await createPage({ slug: "my-page", parentId: root.id });

		const entries = await generateSitemapEntries(0);
		expect(
			entries.find((entry) => entry.url.includes("/my-page"))?.url,
		).toMatch(/\/pi\/evame\/my-page$/);
		const response = await generateSitemapResponse(0);
		expect(response.headers.get("Content-Type")).toContain("application/xml");
		expect(response.headers.get("Cache-Control")).toBe(
			"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
		);
		expect(await response.text()).toContain("/pi/evame/my-page");
	});

	it("表示中のTipitaka階層だけをチャンク対象にする", async () => {
		const root = await createPage({ slug: "tipitaka", kind: "ROOT" });
		await createPage({ slug: "visible-tipitaka", parentId: root.id });
		const hiddenParent = await createPage({
			slug: "hidden-parent",
			kind: "CATEGORY",
			parentId: root.id,
			isVisible: false,
		});
		await createPage({
			slug: "blocked-child",
			parentId: hiddenParent.id,
			isVisible: true,
		});

		expect(await countPublicPages()).toBe(2);
		const entries = await generateSitemapEntries(0);
		expect(entries.some((entry) => entry.url.endsWith("/evame/tipitaka"))).toBe(
			true,
		);
		expect(
			entries.some((entry) => entry.url.endsWith("/evame/visible-tipitaka")),
		).toBe(true);
		expect(entries.some((entry) => entry.url.includes("blocked-child"))).toBe(
			false,
		);

		const firstChunk = await fetchTipitakaPagesWithTranslationsChunk({
			limit: 1,
			offset: 0,
		});
		const secondChunk = await fetchTipitakaPagesWithTranslationsChunk({
			limit: 1,
			offset: 1,
		});
		expect([firstChunk[0]?.slug, secondChunk[0]?.slug]).toEqual([
			"tipitaka",
			"visible-tipitaka",
		]);
	});
});
