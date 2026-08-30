import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { bestTranslationTextSubquery } from "./best-translation-subquery.server";

await setupDbPerFile(import.meta.url);

async function createTestSegment() {
	const page = await createPageWithSegments({
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
	return db
		.selectFrom("segments")
		.selectAll()
		.where("tipitakaPageId", "=", page.id)
		.where("number", "=", 0)
		.executeTakeFirstOrThrow();
}

async function queryBestTranslationText(segmentId: number, locale: string) {
	return db
		.selectFrom("segments")
		.select((expression) =>
			bestTranslationTextSubquery({
				locale,
				segmentId: expression.ref("segments.id"),
			}).as("text"),
		)
		.where("segments.id", "=", segmentId)
		.executeTakeFirstOrThrow();
}

describe("bestTranslationTextSubquery", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("明示的な採用訳をポイントより優先する", async () => {
		const curator = await createUser({ handle: "evame" });
		const translator = await createUser({ handle: "translator" });
		const segment = await createTestSegment();
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

		await expect(queryBestTranslationText(segment.id, "ja")).resolves.toEqual({
			text: "採用訳",
		});
	});

	it("採用訳がない場合はポイント順で選ぶ", async () => {
		const translator = await createUser({ handle: "translator" });
		const segment = await createTestSegment();
		await db
			.insertInto("segmentTranslations")
			.values([
				{
					segmentId: segment.id,
					locale: "ja",
					text: "高ポイント翻訳",
					point: 100,
					userId: translator.id,
				},
				{
					segmentId: segment.id,
					locale: "ja",
					text: "低ポイント翻訳",
					point: 1,
					userId: translator.id,
				},
			])
			.execute();

		await expect(queryBestTranslationText(segment.id, "ja")).resolves.toEqual({
			text: "高ポイント翻訳",
		});
	});

	it("採用訳がなくポイントが同じ場合は新しい翻訳を選ぶ", async () => {
		const translator = await createUser({ handle: "translator" });
		const segment = await createTestSegment();
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

		await expect(queryBestTranslationText(segment.id, "ja")).resolves.toEqual({
			text: "新しい翻訳",
		});
	});
});
