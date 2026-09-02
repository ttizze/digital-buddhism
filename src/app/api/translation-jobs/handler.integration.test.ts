import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import { toSessionUser } from "@/tests/auth-helpers";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { getTranslationJobs } from "./handler";

vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: vi.fn(),
}));

await setupDbPerFile(import.meta.url);

describe("getTranslationJobs", () => {
	afterEach(async () => {
		vi.clearAllMocks();
		await resetDatabase();
	});

	it("未認証ではジョブを返さない", async () => {
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);

		const response = await getTranslationJobs(
			new Request("https://example.com/api/translation-jobs?id=1"),
		);

		expect(response.status).toBe(401);
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
	});

	it("指定IDのうち認証ユーザーが所有するジョブだけを返す", async () => {
		const [currentUser, otherUser, page] = await Promise.all([
			createUser(),
			createUser(),
			createPage({ slug: "translation-job-page" }),
		]);
		const [ownJob, otherJob] = await Promise.all([
			createTranslationJob({
				aiModel: "gemini-pro",
				locale: "ja",
				pageId: page.id,
				userId: currentUser.id,
			}),
			createTranslationJob({
				aiModel: "gemini-pro",
				locale: "en",
				pageId: page.id,
				userId: otherUser.id,
			}),
		]);
		vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(
			toSessionUser(currentUser),
		);

		const response = await getTranslationJobs(
			new Request(
				`https://example.com/api/translation-jobs?id=${ownJob.id}&id=${otherJob.id}`,
			),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([ownJob]);
	});
});
