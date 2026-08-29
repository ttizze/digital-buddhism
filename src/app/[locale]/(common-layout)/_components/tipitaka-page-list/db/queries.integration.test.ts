import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createSegment, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchTipitakaPageTree } from "./queries";

await setupDbPerFile(import.meta.url);

describe("fetchTipitakaPageTree", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("公開中のTipitaka子孫だけを順序どおりに取得し、ページオーナーが選んだタイトル翻訳を返す", async () => {
		const owner = await createUser({ handle: "evame" });
		const translator = await createUser({ handle: "translator" });
		const root = await createPage({
			userId: owner.id,
			slug: "tipitaka",
			status: "ARCHIVE",
			sourceLocale: "pi",
			publishedAt: new Date("2026-01-01T00:00:00.000Z"),
		});
		const second = await createPage({
			userId: owner.id,
			slug: "second",
			parentId: root.id,
			sourceLocale: "pi",
		});
		const first = await createPage({
			userId: owner.id,
			slug: "first",
			parentId: root.id,
			sourceLocale: "pi",
		});
		const hiddenParent = await createPage({
			userId: owner.id,
			slug: "hidden-parent",
			parentId: root.id,
			sourceLocale: "pi",
			status: "DRAFT",
		});
		await createPage({
			userId: owner.id,
			slug: "hidden-child",
			parentId: hiddenParent.id,
			sourceLocale: "pi",
		});
		await db
			.updateTable("pages")
			.set({ order: 2 })
			.where("id", "=", second.id)
			.execute();
		await db
			.updateTable("pages")
			.set({ order: 1 })
			.where("id", "=", first.id)
			.execute();

		const firstTitle = await createSegment({
			pageId: first.id,
			number: 0,
			text: "paṭhama",
			textAndOccurrenceHash: "first-title",
			segmentTypeKey: "PRIMARY",
		});
		await createSegment({
			pageId: second.id,
			number: 0,
			text: "dutiya",
			textAndOccurrenceHash: "second-title",
			segmentTypeKey: "PRIMARY",
		});
		const ownerTranslation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: firstTitle.id,
				locale: "ja",
				text: "第一",
				point: 0,
				userId: translator.id,
			})
			.returning("id")
			.executeTakeFirstOrThrow();
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: firstTitle.id,
				locale: "ja",
				text: "高ポイント",
				point: 100,
				userId: translator.id,
			})
			.execute();
		await db
			.insertInto("translationVotes")
			.values({
				translationId: ownerTranslation.id,
				userId: owner.id,
				isUpvote: true,
			})
			.execute();

		const tree = await fetchTipitakaPageTree("ja");

		expect(tree.map((page) => page.slug)).toEqual(["first", "second"]);
		expect(tree[0]?.titleTranslationText).toBe("第一");
		expect(tree.some((page) => page.slug === "hidden-parent")).toBe(false);
		expect(tree.some((page) => page.slug === "hidden-child")).toBe(false);
	});
});
