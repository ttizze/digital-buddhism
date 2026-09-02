import * as path from "node:path";
import { defineConfig } from "vite-plus";

export default defineConfig({
	test: {
		globals: true,
		slowTestThreshold: 1000,
		exclude: ["**/.worktrees/**", "**/node_modules/**", "**/dist/**"],
		env: {
			// 外部DBの環境変数を使わず、integration testごとに一時file DBを設定する
			TURSO_DATABASE_URL: "",
			TURSO_AUTH_TOKEN: "",
			BETTER_AUTH_SECRET: "test-secret-at-least-thirty-two-characters",
			AUTH_RESEND_KEY: "test-resend-key",
			// テスト環境のWorkerログレベルは logger.server.ts で "error" になる
			// 特定のテストでログを見たい場合は、ここで明示的に設定可能
			// LOG_LEVEL: "debug",
		},
		environment: "jsdom",
		setupFiles: "./vitest.setup.ts",
	},
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "src"),
			"@cloudflare/pages-plugin-vercel-og/api": path.resolve(
				import.meta.dirname,
				"src/tests/cloudflare-vercel-og.ts",
			),
			"cloudflare:workers": path.resolve(
				import.meta.dirname,
				"src/tests/cloudflare-workers.ts",
			),
		},
	},
});
