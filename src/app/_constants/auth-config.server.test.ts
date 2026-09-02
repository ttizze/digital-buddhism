import { describe, expect, it } from "vite-plus/test";
import {
	resolveAuthProviderAvailability,
	resolveServerAuthConfig,
} from "./auth-config.server";

const validSecret = "test-secret-at-least-thirty-two-characters";

describe("サーバー認証設定", () => {
	it("認証プロバイダーなしのローカル設定を許可する", () => {
		expect(
			resolveServerAuthConfig({ BETTER_AUTH_SECRET: validSecret }),
		).toEqual({
			betterAuthSecret: validSecret,
			googleClientId: null,
			googleClientSecret: null,
			magicLinkEnabled: false,
		});
	});

	it("短いBetter Auth secretを拒否する", () => {
		expect(() =>
			resolveServerAuthConfig({ BETTER_AUTH_SECRET: "short" }),
		).toThrow("BETTER_AUTH_SECRET must be at least 32 characters");
	});

	it("Google credentialsの片側だけの設定を拒否する", () => {
		expect(() =>
			resolveServerAuthConfig({
				AUTH_GOOGLE_ID: "google-client-id",
				BETTER_AUTH_SECRET: validSecret,
			}),
		).toThrow(
			"AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET must be configured together",
		);
	});

	it("Worker runtime credentialsからプロバイダーを有効にする", () => {
		const environment = {
			AUTH_GOOGLE_ID: "google-client-id",
			AUTH_GOOGLE_SECRET: "google-client-secret",
			AUTH_RESEND_KEY: "resend-key",
			BETTER_AUTH_SECRET: validSecret,
		};

		expect(resolveAuthProviderAvailability(environment)).toEqual({
			google: true,
			magicLink: true,
		});
		expect(resolveServerAuthConfig(environment)).toMatchObject({
			googleClientId: "google-client-id",
			googleClientSecret: "google-client-secret",
			magicLinkEnabled: true,
		});
	});
});
