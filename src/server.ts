import * as Sentry from "@sentry/cloudflare";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

type WorkerEnv = {
	SENTRY_DSN?: string;
};

export default Sentry.withSentry<WorkerEnv>(
	(env) => ({
		dsn: env.SENTRY_DSN,
		tracesSampleRate: 0.2,
		enableLogs: true,
	}),
	createServerEntry({
		fetch(request: Request) {
			return handler.fetch(request);
		},
	}),
);
