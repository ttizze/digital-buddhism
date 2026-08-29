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

	it("子ページのタイトルにページオーナー推奨の翻訳を使う", async () => {
		const pageOwner = await createUser({ handle: "owner" });
		const translator = await createUser({ handle: "translator" });
		const root = await createPage({
			userId: pageOwner.id,
			slug: "root",
		});
		const child = await createPage({
			userId: pageOwner.id,
			slug: "child",
			parentId: root.id,
		});
		const titleSegment = await createSegment({
			pageId: child.id,
			number: 0,
			text: "Child",
			textAndOccurrenceHash: "child-title",
			segmentTypeKey: "PRIMARY",
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
		const ownerTranslation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: titleSegment.id,
				locale: "ja",
				text: "オーナー推奨翻訳",
				point: 1,
				userId: translator.id,
			})
			.returning("id")
			.executeTakeFirstOrThrow();
		await db
			.insertInto("translationVotes")
			.values({
				translationId: ownerTranslation.id,
				userId: pageOwner.id,
				isUpvote: true,
			})
			.execute();

		const tree = await queryChildPagesTree(root.id, "ja", false);

		expect(tree[0]?.titleTranslationText).toBe("オーナー推奨翻訳");
	});
});
