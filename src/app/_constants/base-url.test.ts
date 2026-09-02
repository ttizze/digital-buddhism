import { afterEach, describe, expect, it, vi } from "vite-plus/test";

describe("公開サイトURL", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("VITE_PUBLIC_DOMAINを公開サイトURLとして使う", async () => {
		vi.stubEnv(
			"VITE_PUBLIC_DOMAIN",
			"https://preview.digital-buddhism.example",
		);
		vi.resetModules();

		const { BASE_URL } = await import("./base-url");

		expect(BASE_URL).toBe("https://preview.digital-buddhism.example");
	});
});
