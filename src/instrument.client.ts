import * as Sentry from "@sentry/tanstackstart-react";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();

if (import.meta.env.PROD && sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		integrations: [Sentry.replayIntegration()],
		tracesSampleRate: 0.2,
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0,
		debug: false,
	});
}
