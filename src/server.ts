import * as Sentry from "@sentry/cloudflare";
import handler from "@tanstack/react-start/server-entry";
import { projectPendingTipitakaReadModels } from "./app/[locale]/_infrastructure/tipitaka-read-model/jobs.server";
import {
	createKvReadModelStore,
	runWithTipitakaReadModelStore,
} from "./app/[locale]/_infrastructure/tipitaka-read-model/store";
import { runWithTranslationQueue } from "./app/[locale]/_infrastructure/translation-queue/context.server";
import {
	consumeTranslationQueue,
	type TranslationQueueBatch,
} from "./app/api/translate/queue-consumer.server";
import { runWithDatabaseRequestContext } from "./db/request-context";

type WorkerExecutionContext = {
	waitUntil(promise: Promise<unknown>): void;
};

interface WorkerScheduledController {
	readonly cron: string;
	readonly scheduledTime: number;
	noRetry(): void;
}

declare global {
	interface CacheStorage {
		readonly default?: Cache;
	}
}

function runTipitakaProjector(env: CloudflareBindings): Promise<number> {
	return runWithTipitakaReadModelStore(
		createKvReadModelStore(env.TIPITAKA_READ_MODELS),
		() =>
			runWithDatabaseRequestContext(
				{
					url: env.TURSO_DATABASE_URL,
					authToken: env.TURSO_AUTH_TOKEN,
				},
				() => projectPendingTipitakaReadModels(),
			),
	);
}

const workerEntry = {
	async fetch(
		request: Request,
		env: CloudflareBindings,
		ctx: WorkerExecutionContext | undefined,
	) {
		const cache =
			request.method === "GET" ? globalThis.caches.default : undefined;
		const cachedResponse = await cache?.match(request);
		if (cachedResponse) return cachedResponse;

		const readModelStore = createKvReadModelStore(env.TIPITAKA_READ_MODELS);
		const response = await runWithTranslationQueue(env.TRANSLATION_QUEUE, () =>
			runWithTipitakaReadModelStore(readModelStore, () =>
				runWithDatabaseRequestContext(
					{
						url: env.TURSO_DATABASE_URL,
						authToken: env.TURSO_AUTH_TOKEN,
					},
					() => handler.fetch(request),
				),
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
			ctx.waitUntil(runTipitakaProjector(env));
		}

		return securedResponse;
	},
	async scheduled(
		_controller: WorkerScheduledController,
		env: CloudflareBindings,
		ctx: WorkerExecutionContext,
	) {
		ctx.waitUntil(runTipitakaProjector(env));
	},
	async queue(
		batch: TranslationQueueBatch,
		env: CloudflareBindings,
		ctx: WorkerExecutionContext,
	) {
		await runWithTranslationQueue(env.TRANSLATION_QUEUE, () =>
			runWithDatabaseRequestContext(
				{
					url: env.TURSO_DATABASE_URL,
					authToken: env.TURSO_AUTH_TOKEN,
				},
				() => consumeTranslationQueue(batch),
			),
		);
		ctx.waitUntil(runTipitakaProjector(env));
	},
};

export default Sentry.withSentry<CloudflareBindings>(
	(env) => ({
		dsn: env.SENTRY_DSN,
		tracesSampleRate: 0.2,
		enableLogs: true,
	}),
	workerEntry,
);
