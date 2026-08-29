import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { bestTranslationTextSubquery } from "./best-translation-subquery.server";

await setupDbPerFile(import.meta.url);
async function queryBestTranslationText(segmentId: number, locale: string) {
	return db
		.selectFrom("segments")
		.innerJoin("pages", "pages.id", "segments.contentId")
		.select((eb) =>
			bestTranslationTextSubquery({
				locale,
				ownerId: eb.ref("pages.userId"),
				segmentId: eb.ref("segments.id"),
			}).as("text"),
		)
		.where("segments.id", "=", segmentId)
		.executeTakeFirstOrThrow();
}

describe("bestTranslationTextSubquery", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("ページオーナーがupvoteした翻訳を優先する", async () => {
		// Arrange
		const pageOwner = await createUser({ handle: "owner" });
		const translator1 = await createUser({ handle: "translator1" });
		const translator2 = await createUser({ handle: "translator2" });

		const page = await createPageWithSegments({
			userId: pageOwner.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "hash0",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const segment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();

		// 高ポイントの翻訳
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "高ポイント翻訳",
				point: 100,
				userId: translator1.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// 低ポイントだがオーナーがupvoteした翻訳
		const ownerUpvotedTranslation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "オーナー推奨翻訳",
				point: 1,
				userId: translator2.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		// オーナーが低ポイント翻訳にupvote
		await db
			.insertInto("translationVotes")
			.values({
				translationId: ownerUpvotedTranslation.id,
				userId: pageOwner.id,
				isUpvote: true,
			})
			.execute();

		// Act
		const result = await queryBestTranslationText(segment.id, "ja");

		// Assert
		expect(result.text).toBe("オーナー推奨翻訳");
	});

	it("オーナーのupvoteがない場合はポイント順", async () => {
		// Arrange
		const pageOwner = await createUser({ handle: "owner" });
		const translator1 = await createUser({ handle: "translator1" });
		const translator2 = await createUser({ handle: "translator2" });

		const page = await createPageWithSegments({
			userId: pageOwner.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "hash0",
					segmentTypeKey: "PRIMARY",
				},
			],
		});

		const segment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();

		// 高ポイントの翻訳
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "高ポイント翻訳",
				point: 100,
				userId: translator1.id,
			})
			.execute();

		// 低ポイントの翻訳
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "低ポイント翻訳",
				point: 1,
				userId: translator2.id,
			})
			.execute();

		// Act
		const result = await queryBestTranslationText(segment.id, "ja");

		// Assert
		expect(result.text).toBe("高ポイント翻訳");
	});

	it("upvoteとポイントが同じ場合は新しい翻訳を優先する", async () => {
		const pageOwner = await createUser({ handle: "owner" });
		const translator = await createUser({ handle: "translator" });
		const page = await createPageWithSegments({
			userId: pageOwner.id,
			slug: "test-page",
			segments: [
				{
					number: 0,
					text: "Hello",
					textAndOccurrenceHash: "hash0",
					segmentTypeKey: "PRIMARY",
				},
			],
		});
		const segment = await db
			.selectFrom("segments")
			.selectAll()
			.where("contentId", "=", page.id)
			.where("number", "=", 0)
			.executeTakeFirstOrThrow();

		await db
			.insertInto("segmentTranslations")
			.values([
				{
					segmentId: segment.id,
					locale: "ja",
					text: "古い翻訳",
					point: 10,
					userId: translator.id,
					createdAt: new Date("2026-01-01T00:00:00.000Z"),
				},
				{
					segmentId: segment.id,
					locale: "ja",
					text: "新しい翻訳",
					point: 10,
					userId: translator.id,
					createdAt: new Date("2026-01-02T00:00:00.000Z"),
				},
			])
			.execute();

		const result = await queryBestTranslationText(segment.id, "ja");

		expect(result.text).toBe("新しい翻訳");
	});
});
