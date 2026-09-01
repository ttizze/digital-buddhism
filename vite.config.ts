import * as path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

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
	if (
		command === "build" &&
		mode === "production" &&
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
		resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
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
		plugins: [
			tailwindcss(),
			cloudflare({
				viteEnvironment: { name: "ssr" },
				config: localWorkerVars ? { vars: localWorkerVars } : undefined,
			}),
			tanstackStart(),
			viteReact(),
		],
	};
});
