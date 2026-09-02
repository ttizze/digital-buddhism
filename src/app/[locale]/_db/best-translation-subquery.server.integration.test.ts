import { beforeEach, describe, expect, it } from "vite-plus/test";
import { queryBestTranslationTextsForPage } from "@/app/[locale]/_infrastructure/tipitaka-read-model/queries.server";
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
		const curator = await createUser({ handle: "tipitaka" });
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

	it("ページ一括版（queryBestTranslationTextsForPage）と同じランキング結果になる", async () => {
		const curator = await createUser({ handle: "tipitaka" });
		const translator = await createUser({ handle: "translator" });
		const page = await createPageWithSegments({
			slug: "ranking-consistency",
			segments: [
				{ number: 0, text: "A", textAndOccurrenceHash: "hashA" },
				{ number: 1, text: "B", textAndOccurrenceHash: "hashB" },
				{ number: 2, text: "C", textAndOccurrenceHash: "hashC" },
			],
		});
		const segments = await db
			.selectFrom("segments")
			.selectAll()
			.where("tipitakaPageId", "=", page.id)
			.orderBy("number")
			.execute();
		const [segmentA, segmentB, segmentC] = segments;

		// A: 採用訳が得票に勝つ / B: 得票順 / C: 同点なら新しい訳
		await db
			.insertInto("segmentTranslations")
			.values([
				{
					segmentId: segmentA.id,
					locale: "ja",
					text: "A高ポイント",
					point: 100,
					userId: translator.id,
					createdAt: new Date("2026-01-01T00:00:00.000Z"),
				},
				{
					segmentId: segmentB.id,
					locale: "ja",
					text: "B高ポイント",
					point: 100,
					userId: translator.id,
					createdAt: new Date("2026-01-01T00:00:00.000Z"),
				},
				{
					segmentId: segmentB.id,
					locale: "ja",
					text: "B低ポイント",
					point: 1,
					userId: translator.id,
					createdAt: new Date("2026-01-01T00:00:00.000Z"),
				},
				{
					segmentId: segmentC.id,
					locale: "ja",
					text: "C古い",
					point: 10,
					userId: translator.id,
					createdAt: new Date("2026-01-01T00:00:00.000Z"),
				},
				{
					segmentId: segmentC.id,
					locale: "ja",
					text: "C新しい",
					point: 10,
					userId: translator.id,
					createdAt: new Date("2026-01-02T00:00:00.000Z"),
				},
			])
			.execute();
		const selectedForA = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segmentA.id,
				locale: "ja",
				text: "A採用訳",
				point: 1,
				userId: translator.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		await db
			.insertInto("selectedSegmentTranslations")
			.values({
				segmentId: selectedForA.segmentId,
				locale: selectedForA.locale,
				translationId: selectedForA.id,
				selectedByUserId: curator.id,
			})
			.execute();

		const batched = await queryBestTranslationTextsForPage(page.id, "ja");
		const perSegment = await Promise.all(
			segments.map((segment) => queryBestTranslationText(segment.id, "ja")),
		);

		expect(batched).toEqual({
			[String(segmentA.id)]: "A採用訳",
			[String(segmentB.id)]: "B高ポイント",
			[String(segmentC.id)]: "C新しい",
		});
		// 相関サブクエリ版と一括版が同じ勝者を選ぶこと（ランキング定義の乖離検知）
		expect(perSegment.map((row) => row.text)).toEqual(
			segments.map((segment) => batched[String(segment.id)]),
		);
	});
});
