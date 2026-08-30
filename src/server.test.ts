import { beforeEach, describe, expect, it, vi } from "vitest";

const { handlerFetchMock, runWithDatabaseRequestContextMock, withSentryMock } =
	vi.hoisted(() => ({
		handlerFetchMock: vi.fn(),
		runWithDatabaseRequestContextMock: vi.fn(
			(_connection: unknown, callback: () => unknown) => callback(),
		),
		withSentryMock: vi.fn(
			(_options: unknown, workerEntry: unknown) => workerEntry,
		),
	}));

vi.mock("@sentry/cloudflare", () => ({
	withSentry: withSentryMock,
}));

vi.mock("@tanstack/react-start/server-entry", () => ({
	default: { fetch: handlerFetchMock },
}));

vi.mock("./db/request-context", () => ({
	runWithDatabaseRequestContext: runWithDatabaseRequestContextMock,
}));

import worker from "./server";

beforeEach(() => {
	handlerFetchMock.mockReset();
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
			},
			undefined,
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
