#!/usr/bin/env bun
import { runConversionCli } from "./convert-romn-to-md/cli";

void runConversionCli().catch((error) => {
	console.error("Conversion failed:", error);
	process.exit(1);
});
