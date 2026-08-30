import * as Sentry from "@sentry/cloudflare";
import handler from "@tanstack/react-start/server-entry";
import { processPendingTipitakaReadModelJobs } from "./app/[locale]/_infrastructure/tipitaka-read-model/jobs.server";
import {
	createKvReadModelStore,
	type KvNamespaceBinding,
	runWithTipitakaReadModelStore,
} from "./app/[locale]/_infrastructure/tipitaka-read-model/store";
import { runWithDatabaseRequestContext } from "./db/request-context";

type WorkerEnv = {
	SENTRY_DSN?: string;
	TURSO_DATABASE_URL?: string;
	TURSO_AUTH_TOKEN?: string;
	TIPITAKA_READ_MODELS: KvNamespaceBinding;
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

		const readModelStore = createKvReadModelStore(env.TIPITAKA_READ_MODELS);
		const response = await runWithTipitakaReadModelStore(readModelStore, () =>
			runWithDatabaseRequestContext(
				{
					url: env.TURSO_DATABASE_URL,
					authToken: env.TURSO_AUTH_TOKEN,
				},
				() => handler.fetch(request),
			),
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

		if (request.method !== "GET" && ctx) {
			ctx.waitUntil(
				runWithTipitakaReadModelStore(
					createKvReadModelStore(env.TIPITAKA_READ_MODELS),
					() =>
						runWithDatabaseRequestContext(
							{
								url: env.TURSO_DATABASE_URL,
								authToken: env.TURSO_AUTH_TOKEN,
							},
							() => processPendingTipitakaReadModelJobs(),
						),
				),
			);
		}

		return securedResponse;
	},
	async scheduled(
		_controller: unknown,
		env: WorkerEnv,
		ctx: WorkerExecutionContext,
	) {
		ctx.waitUntil(
			runWithTipitakaReadModelStore(
				createKvReadModelStore(env.TIPITAKA_READ_MODELS),
				() =>
					runWithDatabaseRequestContext(
						{
							url: env.TURSO_DATABASE_URL,
							authToken: env.TURSO_AUTH_TOKEN,
						},
						() => processPendingTipitakaReadModelJobs(),
					),
			),
		);
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
