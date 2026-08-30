import * as Sentry from "@sentry/cloudflare";
import handler from "@tanstack/react-start/server-entry";
import { runWithDatabaseRequestContext } from "./db/request-context";

type WorkerEnv = {
	SENTRY_DSN?: string;
	TURSO_DATABASE_URL?: string;
	TURSO_AUTH_TOKEN?: string;
};
type WorkerExecutionContext = {
	waitUntil(promise: Promise<unknown>): void;
};

type DefaultCacheStorage = CacheStorage & {
	default?: Cache;
};

const workerEntry = {
	async fetch(
		request: Request,
		env: WorkerEnv,
		ctx: WorkerExecutionContext | undefined,
	) {
		const cache =
			request.method === "GET"
				? (globalThis.caches as DefaultCacheStorage | undefined)?.default
				: undefined;
		const cachedResponse = await cache?.match(request);
		if (cachedResponse) return cachedResponse;

		const response = await runWithDatabaseRequestContext(
			{
				url: env.TURSO_DATABASE_URL,
				authToken: env.TURSO_AUTH_TOKEN,
			},
			() => handler.fetch(request),
		);
		const headers = new Headers(response.headers);
		headers.set("X-Frame-Options", "DENY");
		headers.set("X-Content-Type-Options", "nosniff");
		headers.set(
			"Strict-Transport-Security",
			"max-age=63072000; includeSubDomains; preload",
		);
		headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		headers.set(
			"Permissions-Policy",
			"camera=(), microphone=(), geolocation=()",
		);
		const securedResponse = new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});

		if (
			cache &&
			ctx &&
			securedResponse.status === 200 &&
			securedResponse.headers.has("CDN-Cache-Control") &&
			!securedResponse.headers.has("Set-Cookie")
		) {
			ctx.waitUntil(cache.put(request, securedResponse.clone()));
		}

		return securedResponse;
	},
};

export default Sentry.withSentry<WorkerEnv>(
	(env) => ({
		dsn: env.SENTRY_DSN,
		tracesSampleRate: 0.2,
		enableLogs: true,
	}),
	workerEntry,
);
