// @vitest-environment node

import { readFile } from "node:fs/promises";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { getOgImage } from "./handler";

await setupDbPerFile(import.meta.url);

const { ogAssetStore, fetchAsset } = vi.hoisted(() => {
	const ogAssetStore = new Map<string, Uint8Array>();
	const fetchAsset = vi.fn(async (input: RequestInfo | URL) => {
		const url = input instanceof Request ? input.url : input.toString();
		const assetName = new URL(url).pathname.slice(1);
		const asset = ogAssetStore.get(assetName);
		if (!asset) return new Response(null, { status: 404 });
		const body = new ArrayBuffer(asset.byteLength);
		new Uint8Array(body).set(asset);
		return new Response(body, {
			headers: { "Content-Type": "application/octet-stream" },
		});
	});
	return { ogAssetStore, fetchAsset };
});
const ogAssetFixtures = new Map<string, Uint8Array>();

vi.mock("cloudflare:workers", () => ({
	env: {
		ASSETS: { fetch: fetchAsset },
	},
}));

vi.mock("@cloudflare/pages-plugin-vercel-og/api", () => ({
	ImageResponse: class extends Response {
		constructor() {
			super(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]), {
				headers: { "Content-Type": "image/png" },
			});
		}
	},
}));

const assetPaths = {
	"inter-semi-bold.ttf": "../../../../public/inter-semi-bold.ttf",
	"BIZUDPGothic-Bold.ttf": "../../../../public/BIZUDPGothic-Bold.ttf",
};

beforeAll(async () => {
	for (const [assetName, assetPath] of Object.entries(assetPaths)) {
		const asset = new Uint8Array(
			await readFile(new URL(assetPath, import.meta.url)),
		);
		ogAssetFixtures.set(assetName, asset);
		ogAssetStore.set(assetName, asset);
	}
});

beforeEach(async () => {
	await resetDatabase();
	ogAssetStore.clear();
	for (const [assetName, asset] of ogAssetFixtures) {
		ogAssetStore.set(assetName, asset);
	}
	fetchAsset.mockClear();
});

function expectPng(response: Response): Promise<void> {
	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toBe("image/png");
	return response.arrayBuffer().then((body) => {
		const bytes = new Uint8Array(body);
		expect(bytes.slice(0, 8)).toEqual(
			new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
		);
		expect(bytes.byteLength).toBeGreaterThan(8);
	});
}

describe("GET /api/og", () => {
	it("存在しないページにはキャッシュ可能なPNG画像を返す", async () => {
		const response = await getOgImage(
			new Request("http://localhost/api/og?locale=en&slug=missing-page"),
		);

		await expectPng(response);
		expect(response.headers.get("cache-control")).toBe(
			"public, max-age=0, s-maxage=60, stale-while-revalidate=600",
		);
		expect(fetchAsset).not.toHaveBeenCalled();
	});

	it("通常ページにはserver assetから取得したフォントを使ったPNG画像を返す", async () => {
		await createPageWithSegments({
			slug: "og-page",
			segments: [
				{
					number: 0,
					text: "OG title",
					textAndOccurrenceHash: "og-title",
				},
			],
		});

		const response = await getOgImage(
			new Request("http://localhost/api/og?locale=en&slug=og-page"),
		);

		await expectPng(response);
		expect(response.headers.get("cache-control")).toBe(
			"public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
		);
		expect(fetchAsset).toHaveBeenCalledTimes(2);
		expect(fetchAsset).toHaveBeenCalledWith(
			new URL("http://localhost/inter-semi-bold.ttf"),
		);
		expect(fetchAsset).toHaveBeenCalledWith(
			new URL("http://localhost/BIZUDPGothic-Bold.ttf"),
		);
	});

	it("server assetが欠落している場合は欠落した名前を含むエラーを返す", async () => {
		ogAssetStore.delete("BIZUDPGothic-Bold.ttf");
		await createPageWithSegments({
			slug: "asset-error-page",
			segments: [
				{
					number: 0,
					text: "Asset error",
					textAndOccurrenceHash: "asset-error-title",
				},
			],
		});

		await expect(
			getOgImage(
				new Request("http://localhost/api/og?locale=en&slug=asset-error-page"),
			),
		).rejects.toThrow("Missing OG server asset: BIZUDPGothic-Bold.ttf");
	});
});
