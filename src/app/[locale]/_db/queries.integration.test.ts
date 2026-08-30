import { beforeEach, describe, expect, it } from "vitest";
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

	it("非表示のTipitaka祖先を持つページは直URLでも取得しない", async () => {
		const root = await createPage({
			slug: "tipitaka",
			kind: "ROOT",
			isVisible: true,
		});
		const hiddenParent = await createPage({
			parentId: root.id,
			slug: "hidden-parent",
			kind: "CATEGORY",
			isVisible: false,
		});
		await createPage({
			parentId: hiddenParent.id,
			slug: "visible-child",
			kind: "TEXT",
			isVisible: true,
		});

		await expect(queryPageDetail("visible-child", "ja")).resolves.toBeNull();
	});

	it("対象セグメントごとに明示的な採用訳を選ぶ", async () => {
		const curator = await createUser({ handle: "evame" });
		const translator = await createUser({ handle: "translator" });
		const root = await createPage({ slug: "tipitaka", kind: "ROOT" });
		const page = await createPageWithSegments({
			slug: "translated-page",
			kind: "TEXT",
			parentId: root.id,
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "translated-page-title",
					segmentTypeKey: "PRIMARY",
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
