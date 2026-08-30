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
		const curator = await createUser({ handle: "evame" });
		const translator = await createUser({ handle: "translator" });
		const root = await createPage({ slug: "tipitaka", kind: "ROOT" });
		const child = await createPage({
			slug: "child",
			kind: "TEXT",
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

	it("表示ページを含み非表示ページを除外する", async () => {
		const root = await createPage({ slug: "tipitaka", kind: "ROOT" });
		const visiblePage = await createPage({
			slug: "visible",
			parentId: root.id,
			isVisible: true,
		});
		const hiddenPage = await createPage({
			slug: "hidden",
			parentId: root.id,
			isVisible: false,
		});
		await Promise.all([
			createSegment({
				pageId: visiblePage.id,
				number: 0,
				text: "Visible",
				textAndOccurrenceHash: "visible-title",
			}),
			createSegment({
				pageId: hiddenPage.id,
				number: 0,
				text: "Hidden",
				textAndOccurrenceHash: "hidden-title",
			}),
		]);

		const tree = await queryChildPagesTree(root.id, "ja");
		expect(tree.map((page) => page.slug)).toEqual(["visible"]);
	});
});
