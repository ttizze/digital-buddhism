import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPage, createSegment, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { queryChildPagesTree } from "./queries";

await setupDbPerFile(import.meta.url);

describe("page detail navigation queries", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("子ページのタイトルに明示的な採用訳を使う", async () => {
		const curator = await createUser({ handle: "tipitaka" });
		const translator = await createUser({ handle: "translator" });
		const root = await createPage({ slug: "tipitaka", textLevel: null });
		const child = await createPage({
			slug: "child",
			parentId: root.id,
		});
		const titleSegment = await createSegment({
			pageId: child.id,
			number: 0,
			text: "Child",
			textAndOccurrenceHash: "child-title",
		});
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: titleSegment.id,
				locale: "ja",
				text: "高ポイント翻訳",
				point: 100,
				userId: translator.id,
			})
			.execute();
		const selected = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: titleSegment.id,
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

		const tree = await queryChildPagesTree(root.id, "ja");
		expect(tree[0]?.titleTranslationText).toBe("採用訳");
	});

	it("保存済みの子ページを表示順で含める", async () => {
		const root = await createPage({ slug: "tipitaka", textLevel: null });
		const firstPage = await createPage({
			slug: "first",
			parentId: root.id,
			position: 0,
		});
		const secondPage = await createPage({
			slug: "second",
			parentId: root.id,
			position: 1,
		});
		await Promise.all([
			createSegment({
				pageId: firstPage.id,
				number: 0,
				text: "First",
				textAndOccurrenceHash: "first-title",
			}),
			createSegment({
				pageId: secondPage.id,
				number: 0,
				text: "Second",
				textAndOccurrenceHash: "second-title",
			}),
		]);

		const tree = await queryChildPagesTree(root.id, "ja");
		expect(tree.map((page) => page.slug)).toEqual(["first", "second"]);
	});
});
