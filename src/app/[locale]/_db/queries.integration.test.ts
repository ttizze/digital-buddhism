import { beforeEach, describe, expect, it } from "vite-plus/test";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { queryPageDetail } from "./queries";

await setupDbPerFile(import.meta.url);

describe("queryPageDetail", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("構造ページ配下の本文ページを取得する", async () => {
		const root = await createPage({ slug: "tipitaka", textLevel: null });
		const category = await createPage({
			parentId: root.id,
			slug: "sutta",
			textLevel: null,
		});
		const page = await createPage({
			parentId: category.id,
			slug: "visible-child",
			textLevel: "MULA",
		});

		await expect(queryPageDetail(page.slug, "ja")).resolves.toMatchObject({
			id: page.id,
			textLevel: "MULA",
		});
	});

	it("対象セグメントごとに明示的な採用訳を選ぶ", async () => {
		const curator = await createUser({ handle: "tipitaka" });
		const translator = await createUser({ handle: "translator" });
		const root = await createPage({ slug: "tipitaka", textLevel: null });
		const page = await createPageWithSegments({
			slug: "translated-page",
			parentId: root.id,
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "translated-page-title",
				},
			],
		});
		const segment = await db
			.selectFrom("segments")
			.select("id")
			.where("tipitakaPageId", "=", page.id)
			.executeTakeFirstOrThrow();
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "高ポイント翻訳",
				point: 100,
				userId: translator.id,
			})
			.execute();
		const selected = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "採用訳",
				point: 1,
				userId: translator.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		await db
			.insertInto("selectedSegmentTranslations")
			.values({
				segmentId: selected.segmentId,
				locale: selected.locale,
				translationId: selected.id,
				selectedByUserId: curator.id,
			})
			.execute();

		const result = await queryPageDetail(page.slug, "ja");
		expect(result?.segments[0]?.translationText).toBe("採用訳");
	});
});
