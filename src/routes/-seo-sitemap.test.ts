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

	it("保存済みページをチャンク数とサイトマップURLに含める", async () => {
		const root = await createPage({ slug: "tipitaka", textLevel: null });
		await createPage({
			slug: "stored",
			parentId: root.id,
		});

		expect(await countPublicPages()).toBe(2);
		const entries = await generateSitemapEntries(0);
		expect(entries.some((entry) => entry.url.includes("/stored"))).toBe(true);
	});

	it("Tipitaka固定URLとXMLレスポンスを生成する", async () => {
		const root = await createPage({ slug: "tipitaka", textLevel: null });
		await createPage({ slug: "my-page", parentId: root.id });

		const entries = await generateSitemapEntries(0);
		expect(
			entries.find((entry) => entry.url.includes("/my-page"))?.url,
		).toMatch(/\/pi\/tipitaka\/my-page$/);
		const response = await generateSitemapResponse(0);
		expect(response.headers.get("Content-Type")).toContain("application/xml");
		expect(response.headers.get("Cache-Control")).toBe(
			"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
		);
		expect(await response.text()).toContain("/pi/tipitaka/my-page");
	});

	it("構造ページを含むTipitaka階層全体をチャンク対象にする", async () => {
		const root = await createPage({ slug: "tipitaka", textLevel: null });
		await createPage({ slug: "visible-tipitaka", parentId: root.id });
		const category = await createPage({
			slug: "category",
			textLevel: null,
			parentId: root.id,
		});
		await createPage({
			slug: "category-child",
			parentId: category.id,
		});

		expect(await countPublicPages()).toBe(4);
		const entries = await generateSitemapEntries(0);
		expect(
			entries.some((entry) => entry.url.endsWith("/tipitaka/tipitaka")),
		).toBe(true);
		expect(
			entries.some((entry) => entry.url.endsWith("/tipitaka/visible-tipitaka")),
		).toBe(true);
		expect(entries.some((entry) => entry.url.includes("category-child"))).toBe(
			true,
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
