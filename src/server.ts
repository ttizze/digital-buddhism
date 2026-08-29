import * as Sentry from "@sentry/cloudflare";
import handler from "@tanstack/react-start/server-entry";

type WorkerEnv = {
	SENTRY_DSN?: string;
};

const workerEntry = {
	fetch(request: Request, _env: WorkerEnv, _ctx: unknown) {
		return handler.fetch(request);
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
