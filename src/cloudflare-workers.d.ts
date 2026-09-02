interface CloudflareBindings {
	AUTH_GOOGLE_ID?: string;
	AUTH_GOOGLE_SECRET?: string;
	AUTH_RESEND_KEY?: string;
	BETTER_AUTH_SECRET: string;
	DEEPSEEK_API_KEY?: string;
	EMAIL_FROM?: string;
	GEMINI_API_KEY?: string;
	GOOGLE_ANALYTICS_ID?: string;
	LOG_LEVEL?: string;
	OPENAI_API_KEY?: string;
	TURSO_AUTH_TOKEN?: string;
	TURSO_DATABASE_URL: string;
}

declare module "cloudflare:workers" {
	const env: CloudflareBindings;

	export { env };
}
