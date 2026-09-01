declare module "cloudflare:workers" {
	const env: {
		AUTH_GOOGLE_ID?: string;
		AUTH_GOOGLE_SECRET?: string;
		AUTH_RESEND_KEY?: string;
		BETTER_AUTH_SECRET: string;
		DEEPSEEK_API_KEY?: string;
		EMAIL_FROM?: string;
		GOOGLE_ANALYTICS_ID?: string;
		LOG_LEVEL?: string;
		OPENAI_API_KEY?: string;
		SENTRY_DSN?: string;
		TURSO_DATABASE_URL: string;
		TURSO_AUTH_TOKEN: string;
		GEMINI_API_KEY: string;
		TRANSLATION_QUEUE: import("@/app/api/translate/types").TranslationQueueBinding;
		ASSETS: {
			fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
		};
	};

	export { env };
}
