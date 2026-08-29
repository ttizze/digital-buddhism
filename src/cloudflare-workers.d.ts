declare module "cloudflare:workers" {
	const env: {
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
