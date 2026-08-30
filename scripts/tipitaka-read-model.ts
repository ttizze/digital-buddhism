#!/usr/bin/env bun
import { publishTipitakaReadModelsWithWrangler } from "./tipitaka-import/application/publish-read-model";

void publishTipitakaReadModelsWithWrangler(
	process.argv.includes("--remote"),
).catch((error) => {
	console.error(error);
	process.exit(1);
});
