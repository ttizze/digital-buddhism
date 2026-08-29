import * as Sentry from "@sentry/cloudflare";
import handler from "@tanstack/react-start/server-entry";
import { runWithDatabaseRequestContext } from "./db/request-context";

type WorkerEnv = {
	SENTRY_DSN?: string;
	TURSO_DATABASE_URL?: string;
	TURSO_AUTH_TOKEN?: string;
};

const workerEntry = {
	async fetch(request: Request, env: WorkerEnv, _ctx: unknown) {
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
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
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
