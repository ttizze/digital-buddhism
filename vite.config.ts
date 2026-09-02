import * as path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv, lazyPlugins } from "vite-plus";

// Worker vars are passed from the explicit allowlist below. Prevent Wrangler from
// copying every value in .env.local into the production build's .dev.vars file.
process.env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = "false";

const LOCAL_WORKER_ENV_KEYS = [
	"AUTH_GOOGLE_ID",
	"AUTH_GOOGLE_SECRET",
	"AUTH_RESEND_KEY",
	"BETTER_AUTH_SECRET",
	"DEEPSEEK_API_KEY",
	"EMAIL_FROM",
	"GEMINI_API_KEY",
	"GOOGLE_ANALYTICS_ID",
	"LOG_LEVEL",
	"OPENAI_API_KEY",
	"SENTRY_DSN",
	"TURSO_AUTH_TOKEN",
	"TURSO_DATABASE_URL",
] as const;

export default defineConfig(({ command, mode }) => {
	const publicEnv = loadEnv(mode, process.cwd());
	// Cloudflare Workers Builds の非本番ブランチビルド（プレビュー版、昇格されない）は
	// 本番ドメイン必須の対象外にする。WORKERS_CI_BRANCH はビルド環境が注入する。
	const ciBranch = process.env.WORKERS_CI_BRANCH;
	const isPreviewCiBuild = ciBranch !== undefined && ciBranch !== "main";
	if (
		command === "build" &&
		mode === "production" &&
		!isPreviewCiBuild &&
		!publicEnv.VITE_PUBLIC_DOMAIN
	) {
		throw new Error("VITE_PUBLIC_DOMAIN is required for production builds");
	}
	const workerEnv = command === "serve" ? loadEnv(mode, process.cwd(), "") : {};
	const localWorkerVars =
		command === "serve"
			? Object.fromEntries(
					LOCAL_WORKER_ENV_KEYS.flatMap((key) =>
						workerEnv[key] ? [[key, workerEnv[key]]] : [],
					),
				)
			: undefined;

	return {
		run: {
			cache: { scripts: false, tasks: true },
			tasks: {
				"check:ci": { command: "vp check" },
				"test:ci": { command: "vp test", cache: false },
				"build:ci": {
					command: "vp build --config vite.config.ts",
					env: ["WORKERS_CI_BRANCH", "VITE_PUBLIC_DOMAIN", "VITE_SENTRY_DSN"],
					input: [
						"src/**",
						"public/**",
						"messages/**",
						"vite.config.ts",
						"tsconfig.json",
						"package.json",
						"bun.lock",
						"wrangler.jsonc",
						"!dist/**",
						"!.wrangler/**",
					],
					output: ["dist/**"],
				},
			},
		},
		staged: {
			"*": "vp check --fix",
		},
		fmt: {
			useTabs: true,
			tabWidth: 2,
			printWidth: 80,
			singleQuote: false,
			jsxSingleQuote: false,
			quoteProps: "as-needed",
			trailingComma: "all",
			semi: true,
			arrowParens: "always",
			bracketSameLine: false,
			bracketSpacing: true,
			ignorePatterns: [
				"bun.lock",
				"bun.lockb",
				"build",
				".vscode",
				".next",
				".output",
				"node_modules",
				"**/*.css",
				"**/*.md",
				"**/*.mdx",
				"**/*.yml",
				"**/*.yaml",
				"tipitaka-md",
				"tipitaka-md-nosplit",
				"tipitaka-xml",
				"playwright-report",
				"cst",
				"coverage",
				".turbo",
				".wrangler",
				".cache",
				".data",
				"dist",
				".codex",
				".claude",
				".worktree",
				".worktrees",
				"src/routeTree.gen.ts",
				"src/drizzle/meta",
				"src/drizzle/turso/meta",
			],
		},
		lint: {
			plugins: ["typescript", "unicorn", "oxc"],
			categories: {
				correctness: "error",
			},
			ignorePatterns: [
				"bun.lock",
				"bun.lockb",
				"build",
				".vscode",
				".next",
				".output",
				"node_modules",
				"**/*.css",
				"**/*.md",
				"**/*.mdx",
				"**/*.yml",
				"**/*.yaml",
				"tipitaka-md",
				"tipitaka-md-nosplit",
				"tipitaka-xml",
				"playwright-report",
				"cst",
				"coverage",
				".turbo",
				".wrangler",
				".cache",
				".data",
				"dist",
				".codex",
				".claude",
				".worktree",
				".worktrees",
				"src/routeTree.gen.ts",
				"src/drizzle/meta",
				"src/drizzle/turso/meta",
			],
			options: {
				typeAware: true,
				typeCheck: true,
			},
			jsPlugins: [
				{
					name: "vite-plus",
					specifier: "vite-plus/oxlint-plugin",
				},
			],
			rules: {
				"vite-plus/prefer-vite-plus-imports": "error",
			},
		},
		resolve: {
			alias: {
				"@": path.resolve(import.meta.dirname, "src"),
				pino: path.resolve(import.meta.dirname, "node_modules/pino/browser.js"),
			},
		},
		optimizeDeps: {
			exclude: ["@cloudflare/pages-plugin-vercel-og/api"],
		},
		environments: {
			ssr: {
				optimizeDeps: {
					exclude: ["@cloudflare/pages-plugin-vercel-og/api"],
				},
			},
		},
		plugins: lazyPlugins(() => [
			tailwindcss(),
			cloudflare({
				viteEnvironment: { name: "ssr" },
				config: localWorkerVars ? { vars: localWorkerVars } : undefined,
			}),
			tanstackStart(),
			viteReact(),
		]),
	};
});
