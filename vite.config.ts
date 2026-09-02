import * as path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
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
	const sentrySourceMapsEnabled = Boolean(
		command === "build" &&
		process.env.SENTRY_AUTH_TOKEN &&
		process.env.SENTRY_ORG &&
		process.env.SENTRY_PROJECT &&
		publicEnv.VITE_SENTRY_DSN,
	);

	return {
		run: {
			cache: { scripts: false, tasks: true },
			tasks: {
				"check:ci": { command: "vp check" },
				"test:ci": { command: "vp test", cache: false },
				"build:ci": {
					command: "vp build --config vite.config.ts",
					env: [
						"SENTRY_AUTH_TOKEN",
						"SENTRY_ORG",
						"SENTRY_PROJECT",
						"WORKERS_CI_BRANCH",
						"VITE_PUBLIC_DOMAIN",
						"VITE_SENTRY_DSN",
					],
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
				"worker-configuration.d.ts",
				"src/routeTree.gen.ts",
				"src/drizzle/turso/meta",
				"tools/oxlint/anti-slop/**",
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
				"worker-configuration.d.ts",
				"src/routeTree.gen.ts",
				"src/drizzle/turso/meta",
				"tools/oxlint/anti-slop/**",
			],
			options: {
				typeAware: true,
				typeCheck: true,
			},
			jsPlugins: [
				{
					name: "anti-slop",
					specifier: "./tools/oxlint/anti-slop/index.ts",
				},
				{
					name: "vite-plus",
					specifier: "vite-plus/oxlint-plugin",
				},
			],
			rules: {
				"anti-slop/no-chained-type-assertions": "error",
				"anti-slop/no-conditional-empty-object-spread": "error",
				"anti-slop/no-known-value-widening": "error",
				"anti-slop/no-module-mocking": "error",
				"anti-slop/no-object-parameters": "error",
				"anti-slop/no-reflect-apply": "error",
				"anti-slop/no-reflect-get": "error",
				"anti-slop/no-runtime-typeof": "error",
				"anti-slop/no-shape-in-symbol-names": "error",
				"anti-slop/no-unknown-parameters": "error",
				"anti-slop/no-unknown-returns": "error",
				"anti-slop/no-unknown-type-aliases": "error",
				"anti-slop/no-unsafe-dictionary-type": "error",
				"anti-slop/no-widen-then-assert": "error",
				"anti-slop/require-safety-comment-for-type-assertion": "error",
				complexity: ["error", 22],
				"vite-plus/prefer-vite-plus-imports": "error",
			},
		},
		resolve: {
			alias: {
				"@": path.resolve(import.meta.dirname, "src"),
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
			...(sentrySourceMapsEnabled
				? sentryTanstackStart({
						authToken: process.env.SENTRY_AUTH_TOKEN,
						autoInstrumentMiddleware: false,
						org: process.env.SENTRY_ORG,
						project: process.env.SENTRY_PROJECT,
						telemetry: false,
					})
				: []),
		]),
	};
});
