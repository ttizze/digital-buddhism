import { csrfSymbol } from "@tanstack/react-start";
import { describe, expect, it } from "vitest";

import { startInstance } from "./start";

describe("TanStack Startのrequest middleware", () => {
	it("CSRF middlewareだけを1件登録する", async () => {
		const options = await startInstance.getOptions();
		const [csrfMiddleware] = options.requestMiddleware ?? [];

		expect(options.requestMiddleware).toHaveLength(1);
		expect(csrfMiddleware).toBeDefined();
		if (!csrfMiddleware) {
			throw new Error("CSRF middlewareが登録されていません");
		}
		expect(csrfSymbol in csrfMiddleware).toBe(true);
	});
});
