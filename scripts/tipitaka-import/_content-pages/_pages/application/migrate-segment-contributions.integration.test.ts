import { beforeEach, describe, expect, it } from "vite-plus/test";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import {
	assertNoBodyContributions,
	migrateSegmentContributions,
} from "./migrate-segment-contributions";

await setupDbPerFile(import.meta.url);

describe("migrateSegmentContributions", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("分割前ページの翻訳・語釈・完了状態を対応する子ページへ移す", async () => {
		const user = await createUser();
		const sourcePage = await createPageWithSegments({
			slug: "source-page",
			segments: [
				{ number: 0, text: "Book title", textAndOccurrenceHash: "old-title" },
				{
					number: 1,
					text: 'Buddhaṃ <span class="pb" data-ed="V"></span>saraṇaṃ',
					textAndOccurrenceHash: "old-body-1",
				},
				{
					number: 2,
					text: 'Dhamma <span class="note">variant</span>desanā',
					textAndOccurrenceHash: "old-body-2",
				},
			],
		});
		const targetPage = await createPageWithSegments({
			slug: "target-page",
			segments: [
				{
					number: 0,
					text: "Buddhaṃ saraṇaṃ",
					textAndOccurrenceHash: "new-body-1",
				},
				{
					number: 1,
					text: "Dhamma desanā",
					textAndOccurrenceHash: "new-body-2",
				},
			],
		});
		const sourceSegments = await db
			.selectFrom("segments")
			.select(["id", "number"])
			.where("tipitakaPageId", "=", sourcePage.id)
			.orderBy("number")
			.execute();
		const titleSegment = sourceSegments[0];
		const firstBodySegment = sourceSegments[1];
		const secondBodySegment = sourceSegments[2];
		if (!titleSegment || !firstBodySegment || !secondBodySegment) {
			throw new Error("Test source segments are missing");
		}
		const translations = await db
			.insertInto("segmentTranslations")
			.values([
				{
					segmentId: titleSegment.id,
					locale: "ja",
					text: "書名",
					userId: user.id,
				},
				{
					segmentId: firstBodySegment.id,
					locale: "ja",
					text: "仏に帰依する",
					userId: user.id,
				},
				{
					segmentId: secondBodySegment.id,
					locale: "ja",
					text: "法の説示",
					userId: user.id,
				},
			])
			.returning(["id", "segmentId"])
			.execute();
		const firstBodyTranslation = translations.find(
			(translation) => translation.segmentId === firstBodySegment.id,
		);
		if (!firstBodyTranslation) {
			throw new Error("Test translation is missing");
		}
		await db
			.insertInto("selectedSegmentTranslations")
			.values({
				segmentId: firstBodySegment.id,
				locale: "ja",
				translationId: firstBodyTranslation.id,
				selectedByUserId: user.id,
			})
			.execute();
		await db
			.insertInto("translationVotes")
			.values({
				translationId: firstBodyTranslation.id,
				userId: user.id,
				isUpvote: true,
			})
			.execute();
		const glossSet = await db
			.insertInto("segmentGlossSets")
			.values({
				segmentId: secondBodySegment.id,
				locale: "ja",
				userId: user.id,
			})
			.returning("id")
			.executeTakeFirstOrThrow();
		await db
			.insertInto("selectedSegmentGlossSets")
			.values({
				segmentId: secondBodySegment.id,
				locale: "ja",
				glossSetId: glossSet.id,
				selectedByUserId: user.id,
			})
			.execute();
		await db
			.insertInto("translationJobs")
			.values({
				pageId: sourcePage.id,
				userId: user.id,
				locale: "ja",
				aiModel: "test-model",
				status: "COMPLETED",
				progress: 100,
			})
			.execute();
		await db
			.insertInto("pageLocaleTranslationProofs")
			.values({
				pageId: sourcePage.id,
				locale: "ja",
				translationProofStatus: "HUMAN_TOUCHED",
			})
			.execute();

		await expect(
			migrateSegmentContributions(sourcePage.id, targetPage.id),
		).resolves.toBe(2);
		await expect(
			assertNoBodyContributions(sourcePage.id),
		).resolves.toBeUndefined();

		const targetSegments = await db
			.selectFrom("segments")
			.select(["id", "number"])
			.where("tipitakaPageId", "=", targetPage.id)
			.orderBy("number")
			.execute();
		const firstTargetSegment = targetSegments[0];
		const secondTargetSegment = targetSegments[1];
		if (!firstTargetSegment || !secondTargetSegment) {
			throw new Error("Test target segments are missing");
		}
		await expect(
			db
				.selectFrom("segmentTranslations")
				.select(["segmentId", "text"])
				.orderBy("id")
				.execute(),
		).resolves.toEqual([
			{ segmentId: titleSegment.id, text: "書名" },
			{ segmentId: firstTargetSegment.id, text: "仏に帰依する" },
			{ segmentId: secondTargetSegment.id, text: "法の説示" },
		]);
		await expect(
			db
				.selectFrom("selectedSegmentTranslations")
				.select(["segmentId", "translationId"])
				.executeTakeFirstOrThrow(),
		).resolves.toEqual({
			segmentId: firstTargetSegment.id,
			translationId: firstBodyTranslation.id,
		});
		await expect(
			db
				.selectFrom("translationVotes")
				.select("translationId")
				.executeTakeFirstOrThrow(),
		).resolves.toEqual({ translationId: firstBodyTranslation.id });
		await expect(
			db
				.selectFrom("selectedSegmentGlossSets")
				.select(["segmentId", "glossSetId"])
				.executeTakeFirstOrThrow(),
		).resolves.toEqual({
			segmentId: secondTargetSegment.id,
			glossSetId: glossSet.id,
		});
		await expect(
			db
				.selectFrom("translationJobs")
				.select(["locale", "status", "progress"])
				.where("pageId", "=", targetPage.id)
				.executeTakeFirstOrThrow(),
		).resolves.toEqual({ locale: "ja", status: "COMPLETED", progress: 100 });
		await expect(
			db
				.selectFrom("pageLocaleTranslationProofs")
				.select(["locale", "translationProofStatus"])
				.where("pageId", "=", targetPage.id)
				.executeTakeFirstOrThrow(),
		).resolves.toEqual({
			locale: "ja",
			translationProofStatus: "HUMAN_TOUCHED",
		});
	});

	it("対応しない本文への投稿が残る場合は索引化を拒否する", async () => {
		const user = await createUser();
		const sourcePage = await createPageWithSegments({
			slug: "unmatched-source",
			segments: [
				{ number: 0, text: "Title", textAndOccurrenceHash: "title" },
				{ number: 1, text: "Old body", textAndOccurrenceHash: "old-body" },
			],
		});
		const targetPage = await createPageWithSegments({
			slug: "unmatched-target",
			segments: [
				{ number: 0, text: "New body", textAndOccurrenceHash: "new-body" },
			],
		});
		const sourceBody = await db
			.selectFrom("segments")
			.select("id")
			.where("tipitakaPageId", "=", sourcePage.id)
			.where("number", "=", 1)
			.executeTakeFirstOrThrow();
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: sourceBody.id,
				locale: "ja",
				text: "旧本文",
				userId: user.id,
			})
			.execute();

		await expect(
			migrateSegmentContributions(sourcePage.id, targetPage.id),
		).resolves.toBe(0);
		await expect(assertNoBodyContributions(sourcePage.id)).rejects.toThrow(
			"1 body segments still have translations or glosses",
		);
	});
});
