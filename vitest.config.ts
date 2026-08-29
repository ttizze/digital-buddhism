import * as path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		globals: true,
		slowTestThreshold: 1000,
		exclude: ["**/.worktrees/**", "**/node_modules/**", "**/dist/**"],
		env: {
			// 外部DBの環境変数を使わず、integration testごとに一時file DBを設定する
			TURSO_DATABASE_URL: "",
			TURSO_AUTH_TOKEN: "",
			SESSION_SECRET: "test",
			ENCRYPTION_KEY:
				"2f9a0a1b3c4d5e6f7890123456789012345678901234567890abcdef123456",
			RESEND_API_KEY: "test",
			MAGIC_LINK_SECRET: "test",
			// テスト環境のログレベルは logger.ts で自動的に "error" に設定される
			// 特定のテストでログを見たい場合は、ここで明示的に設定可能
			// LOG_LEVEL: "debug",
		},
		environment: "jsdom",
		setupFiles: "./vitest.setup.ts",
		server: {
			deps: {
				inline: ["react-tweet"],
			},
		},
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
