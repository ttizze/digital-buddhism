import { beforeEach, describe, expect, it } from "vite-plus/test";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { searchPagesByContent } from "./page-search.server";

await setupDbPerFile(import.meta.url);

const createSearchPage = (slug: string, text: string) =>
	createPageWithSegments({
		slug,
		segments: [{ number: 0, text, textAndOccurrenceHash: `${slug}-title` }],
	});

describe("page search", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("LIKEワイルドカードを文字として検索する", async () => {
		await createSearchPage("literal-percent", "100% complete");
		await createSearchPage("wildcard-match", "100x complete");

		const result = await searchPagesByContent("%", 0, 10, "en");

		expect(result.total).toBe(1);
		expect(result.pageForLists.map((page) => page.slug)).toEqual([
			"literal-percent",
		]);
	});

	it("DBでページングしつつ全件数を返す", async () => {
		await createSearchPage("match-1", "match one");
		await createSearchPage("match-2", "match two");
		await createSearchPage("match-3", "match three");

		const result = await searchPagesByContent("match", 1, 1, "en");

		expect(result.total).toBe(3);
		expect(result.pageForLists).toHaveLength(1);
		expect(result.pageForLists[0]?.titleSegment.text).toBe("match two");
	});
});
