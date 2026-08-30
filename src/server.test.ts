import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	handlerFetchMock,
	processPendingReadModelJobsMock,
	runWithDatabaseRequestContextMock,
	withSentryMock,
} = vi.hoisted(() => ({
	handlerFetchMock: vi.fn(),
	processPendingReadModelJobsMock: vi.fn(),
	runWithDatabaseRequestContextMock: vi.fn(
		(_connection: unknown, callback: () => unknown) => callback(),
	),
	withSentryMock: vi.fn(
		(_options: unknown, workerEntry: unknown) => workerEntry,
	),
}));
const cacheMatchMock = vi.fn();
const cachePutMock = vi.fn();
const waitUntilMock = vi.fn();
const kvGetMock = vi.fn();
const kvPutMock = vi.fn();
const readModelBinding = {
	get: kvGetMock,
	put: kvPutMock,
};

vi.mock("@sentry/cloudflare", () => ({
	withSentry: withSentryMock,
}));

vi.mock("@tanstack/react-start/server-entry", () => ({
	default: { fetch: handlerFetchMock },
}));

vi.mock("./db/request-context", () => ({
	runWithDatabaseRequestContext: runWithDatabaseRequestContextMock,
}));

vi.mock(
	"./app/[locale]/_infrastructure/tipitaka-read-model/jobs.server",
	() => ({
		processPendingTipitakaReadModelJobs: processPendingReadModelJobsMock,
	}),
);

import worker from "./server";

beforeEach(() => {
	cacheMatchMock.mockReset().mockResolvedValue(undefined);
	cachePutMock.mockReset().mockResolvedValue(undefined);
	waitUntilMock.mockReset();
	kvGetMock.mockReset();
	kvPutMock.mockReset();
	vi.stubGlobal("caches", {
		default: {
			match: cacheMatchMock,
			put: cachePutMock,
		},
	});
	handlerFetchMock.mockReset();
	processPendingReadModelJobsMock.mockReset().mockResolvedValue(0);
	runWithDatabaseRequestContextMock.mockClear();
});

describe("Cloudflare Workerのセキュリティヘッダー", () => {
	it("元レスポンスのstatus・body・headerを維持して付与する", async () => {
		const originalResponse = new Response("upstream body", {
			status: 201,
			headers: {
				"content-type": "text/plain",
				"x-upstream-header": "kept",
			},
		});
		handlerFetchMock.mockResolvedValueOnce(originalResponse);

		const response = await worker.fetch(
			new Request("https://digital-buddhism.test/"),
			{
				SENTRY_DSN: "https://sentry.test/1",
				TURSO_DATABASE_URL: "https://db.test",
				TURSO_AUTH_TOKEN: "db-token",
				TIPITAKA_READ_MODELS: readModelBinding,
			},
			{ waitUntil: waitUntilMock },
		);

		expect(response.status).toBe(201);
		expect(await response.text()).toBe("upstream body");
		expect(response.headers.get("content-type")).toBe("text/plain");
		expect(response.headers.get("x-upstream-header")).toBe("kept");
		expect(response.headers.get("x-frame-options")).toBe("DENY");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("strict-transport-security")).toBe(
			"max-age=63072000; includeSubDomains; preload",
		);
		expect(response.headers.get("referrer-policy")).toBe(
			"strict-origin-when-cross-origin",
		);
		expect(response.headers.get("permissions-policy")).toBe(
			"camera=(), microphone=(), geolocation=()",
		);
	});
});

describe("Cloudflare Workerの公開レスポンスキャッシュ", () => {
	it("公開GETレスポンスをCache APIへ保存する", async () => {
		handlerFetchMock.mockResolvedValueOnce(
			new Response("fresh body", {
				headers: {
					"CDN-Cache-Control": "max-age=600",
				},
			}),
		);
		const request = new Request("https://digital-buddhism.test/ja");

		const response = await worker.fetch(
			request,
			{
				TURSO_DATABASE_URL: "https://db.test",
				TURSO_AUTH_TOKEN: "db-token",
				TIPITAKA_READ_MODELS: readModelBinding,
			},
			{ waitUntil: waitUntilMock },
		);

		expect(await response.text()).toBe("fresh body");
		expect(cachePutMock).toHaveBeenCalledOnce();
		expect(cachePutMock.mock.calls[0]?.[0]).toBe(request);
		const cachedResponse = cachePutMock.mock.calls[0]?.[1] as Response;
		expect(cachedResponse.headers.get("x-frame-options")).toBe("DENY");
		expect(waitUntilMock).toHaveBeenCalledWith(
			cachePutMock.mock.results[0]?.value,
		);
	});

	it("Cache APIのヒット時はDBとSSRを実行しない", async () => {
		cacheMatchMock.mockResolvedValueOnce(new Response("cached body"));

		const response = await worker.fetch(
			new Request("https://digital-buddhism.test/ja"),
			{
				TURSO_DATABASE_URL: "https://db.test",
				TURSO_AUTH_TOKEN: "db-token",
				TIPITAKA_READ_MODELS: readModelBinding,
			},
			{ waitUntil: waitUntilMock },
		);

		expect(await response.text()).toBe("cached body");
		expect(runWithDatabaseRequestContextMock).not.toHaveBeenCalled();
		expect(handlerFetchMock).not.toHaveBeenCalled();
		expect(cachePutMock).not.toHaveBeenCalled();
	});
});

describe("Cloudflare WorkerのRead Model更新", () => {
	it("更新リクエスト後に保留jobをwaitUntilで処理する", async () => {
		handlerFetchMock.mockResolvedValueOnce(Response.json({ success: true }));

		const response = await worker.fetch(
			new Request("https://digital-buddhism.test/api/segment-translations", {
				method: "POST",
			}),
			{
				TURSO_DATABASE_URL: "https://db.test",
				TURSO_AUTH_TOKEN: "db-token",
				TIPITAKA_READ_MODELS: readModelBinding,
			},
			{ waitUntil: waitUntilMock },
		);

		expect(response.status).toBe(200);
		expect(processPendingReadModelJobsMock).toHaveBeenCalledOnce();
		expect(waitUntilMock).toHaveBeenCalledWith(expect.any(Promise));
	});
});
