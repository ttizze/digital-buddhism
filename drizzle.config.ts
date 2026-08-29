import { defineConfig } from "drizzle-kit";

if (!process.env.TURSO_DATABASE_URL) {
	throw new Error("TURSO_DATABASE_URL is not defined");
}

export default defineConfig({
	schema: "./src/drizzle/schema.ts",
	out: "./src/drizzle/turso",
	dialect: "turso",
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL,
		authToken: process.env.TURSO_AUTH_TOKEN,
	},
	verbose: true,
	strict: true,
});
