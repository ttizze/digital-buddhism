import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const { captureExceptionMock, initMock } = vi.hoisted(() => ({
	captureExceptionMock: vi.fn(),
	initMock: vi.fn(),
}));

vi.mock("@sentry/tanstackstart-react", () => ({
	captureException: captureExceptionMock,
	init: initMock,
}));

let dispose: (() => void) | undefined;

afterEach(() => {
	dispose?.();
	dispose = undefined;
	vi.clearAllMocks();
	vi.unstubAllEnvs();
	vi.resetModules();
});

async function loadReporter() {
	vi.stubEnv("PROD", true);
	vi.stubEnv("SSR", false);
	vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.test/1");
	return import("./instrument");
}

describe("ブラウザエラー監視", () => {
	it("通常表示ではSentryを初期化しない", async () => {
		const { installBrowserErrorReporter } = await loadReporter();
		dispose = installBrowserErrorReporter();

		expect(initMock).not.toHaveBeenCalled();
	});

	it("最初のブラウザ例外でエラー専用Sentryを初期化して送信する", async () => {
		const { installBrowserErrorReporter } = await loadReporter();
		dispose = installBrowserErrorReporter();
		const error = new Error("browser failed");

		window.dispatchEvent(new ErrorEvent("error", { error }));

		await vi.waitFor(() => {
			expect(initMock).toHaveBeenCalledWith({
				dsn: "https://public@example.test/1",
				debug: false,
			});
			expect(captureExceptionMock).toHaveBeenCalledWith(error);
		});
	});
});
