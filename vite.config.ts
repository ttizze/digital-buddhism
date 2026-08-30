import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, process.cwd());
	if (command === "build" && mode === "production" && !env.VITE_PUBLIC_DOMAIN) {
		throw new Error("VITE_PUBLIC_DOMAIN is required for production builds");
	}

	return {
		plugins: [
			tsconfigPaths(),
			tailwindcss(),
			cloudflare({ viteEnvironment: { name: "ssr" } }),
			tanstackStart(),
			viteReact(),
		],
	};
});
