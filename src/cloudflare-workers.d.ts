declare module "cloudflare:workers" {
	const env: {
		ASSETS: {
			fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
		};
		IMAGES: {
			input(stream: ReadableStream<Uint8Array>): {
				transform(options: { width: number }): {
					output(options: { format: "image/jpeg"; quality: number }): Promise<{
						response(): Response;
					}>;
				};
			};
		};
	};

	export { env };
}
