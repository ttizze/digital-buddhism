import { createClientOnlyFn } from "@tanstack/react-start";

type SentryBrowserClient = {
	captureException(cause: unknown): void;
};

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();
const canReportBrowserErrors =
	!import.meta.env.SSR && import.meta.env.PROD && Boolean(sentryDsn);

let sentryClientPromise: Promise<SentryBrowserClient | undefined> | undefined;
let globalListenersInstalled = false;

const handleWindowError = (event: ErrorEvent): void => {
	captureBrowserException(event.error ?? new Error(event.message));
};

const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
	captureBrowserException(event.reason);
};

function removeGlobalErrorListeners(): void {
	if (!globalListenersInstalled) return;
	window.removeEventListener("error", handleWindowError);
	window.removeEventListener("unhandledrejection", handleUnhandledRejection);
	globalListenersInstalled = false;
}

function loadSentryClient():
	| Promise<SentryBrowserClient | undefined>
	| undefined {
	if (!canReportBrowserErrors) return undefined;
	if (sentryClientPromise) return sentryClientPromise;

	sentryClientPromise = import("@sentry/tanstackstart-react")
		.then(({ captureException, init }) => {
			init({
				dsn: sentryDsn,
				debug: false,
			});
			removeGlobalErrorListeners();
			return { captureException };
		})
		.catch(() => {
			sentryClientPromise = undefined;
			return undefined;
		});

	return sentryClientPromise;
}

export const captureBrowserException = createClientOnlyFn(
	(cause: unknown): void => {
		const clientPromise = loadSentryClient();
		if (!clientPromise) return;
		void clientPromise.then((client) => client?.captureException(cause));
	},
);

export const installBrowserErrorReporter = createClientOnlyFn(
	(): (() => void) => {
		if (!canReportBrowserErrors || globalListenersInstalled) {
			return () => undefined;
		}

		window.addEventListener("error", handleWindowError);
		window.addEventListener("unhandledrejection", handleUnhandledRejection);
		globalListenersInstalled = true;
		return removeGlobalErrorListeners;
	},
);
