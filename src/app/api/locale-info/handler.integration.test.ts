import { afterEach, describe, expect, it } from "vitest";
import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import { TIPITAKA_SOURCE_LOCALE } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { getLocaleInfo } from "./handler";

await setupDbPerFile(import.meta.url);

describe("getLocaleInfo", () => {
	afterEach(async () => {
		await resetDatabase();
	});

	it("公開UIに必要なロケールとproofだけを返す", async () => {
		const user = await createUser();
		const page = await createPage({ slug: "locale-info-page" });
		const job = await createTranslationJob({
			aiModel: "gemini-pro",
			locale: "ja",
			pageId: page.id,
			userId: user.id,
		});
		await Promise.all([
			db
				.updateTable("translationJobs")
				.set({ status: "COMPLETED", progress: 100 })
				.where("id", "=", job.id)
				.execute(),
			db
				.insertInto("pageLocaleTranslationProofs")
				.values({
					locale: "ja",
					pageId: page.id,
					translationProofStatus: "MACHINE_DRAFT",
				})
				.execute(),
		]);

		const response = await getLocaleInfo(
			new Request(
				"https://example.com/api/locale-info?pageSlug=locale-info-page",
			),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			sourceLocale: TIPITAKA_SOURCE_LOCALE,
			translatedLocales: ["ja"],
			translationProofs: [
				{
					locale: "ja",
					translationProofStatus: "MACHINE_DRAFT",
				},
			],
		});
	});
});
