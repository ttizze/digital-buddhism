import * as Sentry from "@sentry/cloudflare";
import handler from "@tanstack/react-start/server-entry";
import { runWithDatabaseRequestContext } from "./db/request-context";

type WorkerEnv = {
	SENTRY_DSN?: string;
	HYPERDRIVE?: { connectionString: string };
};

const workerEntry = {
	fetch(request: Request, env: WorkerEnv, _ctx: unknown) {
		return runWithDatabaseRequestContext(env.HYPERDRIVE?.connectionString, () =>
			handler.fetch(request),
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
