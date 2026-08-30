import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Tipitakaルート", () => {
	it("ユーザーhandleではなく静的namespaceとしてrootと記事詳細を公開する", () => {
		expect(existsSync(resolve("src/routes/$locale._common.tipitaka.tsx"))).toBe(
			true,
		);
		expect(
			existsSync(resolve("src/routes/$locale._common.tipitaka_.$pageSlug.tsx")),
		).toBe(true);
		expect(
			existsSync(resolve("src/routes/$locale._common.$handle_.$pageSlug.tsx")),
		).toBe(false);
	});
});
