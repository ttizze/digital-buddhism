/*
目的: syncAnnotationLinksByParagraphNumber の「段落番号一致によるアノテーションリンク作成」と
「主要な例外ケース」を担保する。

方法: 実際のデータベースとKysely ORMを使用した統合テスト（古典派）。
*/

import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import type { Segment, TipitakaPage } from "@/db/types.helpers";
import {
	getSegmentTypeId,
	resetDatabase,
	setupMasterData,
} from "@/tests/db-helpers";
import { createPageWithSegments } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { syncAnnotationLinksByParagraphNumber } from "./index";

await setupDbPerFile(import.meta.url);
async function addParagraphNumbersToSegments(
	segmentParagraphPairs: Array<{ segmentId: number; paragraphNumber: string }>,
): Promise<void> {
	const metadataType = await db
		.selectFrom("segmentMetadataTypes")
		.selectAll()
		.where("key", "=", "PARAGRAPH_NUMBER")
		.executeTakeFirst();
	if (!metadataType) {
		throw new Error("PARAGRAPH_NUMBER metadata type not found");
	}
	await db
		.insertInto("segmentMetadata")
		.values(
			segmentParagraphPairs.map(({ segmentId, paragraphNumber }) => ({
				segmentId,
				metadataTypeId: metadataType.id,
				value: paragraphNumber,
			})),
		)
		.execute();
}

async function createAnnotationPageWithSegments(
	texts: string[],
): Promise<{ annotationPageId: number; annotationSegments: Segment[] }> {
	const annotationPage = await createPageWithSegments({
		slug: "annotation-page",
		kind: "COMMENTARY",
		segments: texts.map((text, index) => ({
			number: index,
			text,
			textAndOccurrenceHash: `hash-ann-${index}`,
			segmentTypeKey: "COMMENTARY",
		})),
	});
	const annotationSegments = await db
		.selectFrom("segments")
		.selectAll()
		.where("tipitakaPageId", "=", annotationPage.id)
		.orderBy("number")
		.execute();

	return { annotationPageId: annotationPage.id, annotationSegments };
}

async function createMainPageWithParagraphNumbers(
	paragraphNumbers: string[],
): Promise<{ mainPage: TipitakaPage; mainSegments: Segment[] }> {
	const mainPage = (await createPageWithSegments({
		slug: "main-page",
		kind: "TEXT",
		segments: paragraphNumbers.map((_, i) => ({
			number: i,
			text: `Main segment ${i}`,
			textAndOccurrenceHash: `hash-main-${i}`,
			segmentTypeKey: "PRIMARY",
		})),
	})) as TipitakaPage;
	const mainSegments = await db
		.selectFrom("segments")
		.selectAll()
		.where("tipitakaPageId", "=", mainPage.id)
		.orderBy("number")
		.execute();

	await addParagraphNumbersToSegments(
		mainSegments.map((seg, i) => ({
			segmentId: seg.id,
			paragraphNumber: paragraphNumbers[i] ?? "",
		})),
	);

	return { mainPage, mainSegments };
}

describe("syncAnnotationLinksByParagraphNumber", () => {
	beforeEach(async () => {
		await resetDatabase();
		await setupMasterData();
	});

	it("段落番号が一致する場合、アノテーションリンクが作成される", async () => {
		const { mainPage, mainSegments } = await createMainPageWithParagraphNumbers(
			["1", "2"],
		);
		const { annotationPageId, annotationSegments } =
			await createAnnotationPageWithSegments(["Ann 1", "Ann 2"]);

		const paragraphToAnnotationIds = new Map([
			["1", [annotationSegments[0].id]],
			["2", [annotationSegments[1].id]],
		]);

		await db
			.transaction()
			.execute(async (tx) =>
				syncAnnotationLinksByParagraphNumber(
					tx,
					annotationPageId,
					paragraphToAnnotationIds,
					mainPage.id,
				),
			);

		const links = await db
			.selectFrom("segmentAnnotationLinks")
			.selectAll()
			.where(
				"annotationSegmentId",
				"in",
				annotationSegments.map((s) => s.id),
			)
			.execute();
		expect(links).toHaveLength(2);
		expect(links).toContainEqual(
			expect.objectContaining({
				mainSegmentId: mainSegments[0].id,
				annotationSegmentId: annotationSegments[0].id,
			}),
		);
		expect(links).toContainEqual(
			expect.objectContaining({
				mainSegmentId: mainSegments[1].id,
				annotationSegmentId: annotationSegments[1].id,
			}),
		);
	});

	it("TEXTページでも、この関数単体ではリンクを作成する", async () => {
		const { mainPage } = await createMainPageWithParagraphNumbers(["1"]);
		const primaryPage = await createPageWithSegments({
			slug: "primary-annotation-page",
			kind: "TEXT",
			segments: [
				{
					number: 0,
					text: "Primary segment",
					textAndOccurrenceHash: "hash-primary",
				},
			],
		});
		const primarySegment = await db
			.selectFrom("segments")
			.selectAll()
			.where("tipitakaPageId", "=", primaryPage.id)
			.executeTakeFirstOrThrow();

		await db
			.transaction()
			.execute(async (tx) =>
				syncAnnotationLinksByParagraphNumber(
					tx,
					primaryPage.id,
					new Map([["1", [primarySegment.id]]]),
					mainPage.id,
				),
			);

		const links = await db
			.selectFrom("segmentAnnotationLinks")
			.selectAll()
			.where("annotationSegmentId", "=", primarySegment.id)
			.execute();
		expect(links).toHaveLength(1);
	});

	it("paragraphNumberToAnnotationSegmentIdsが空の場合、リンクは作成されない", async () => {
		const { mainPage, mainSegments } = await createMainPageWithParagraphNumbers(
			["1"],
		);
		const { annotationPageId, annotationSegments } =
			await createAnnotationPageWithSegments(["Ann"]);

		// 既存リンクを作成
		await db
			.insertInto("segmentAnnotationLinks")
			.values({
				mainSegmentId: mainSegments[0].id,
				annotationSegmentId: annotationSegments[0].id,
			})
			.execute();

		await db
			.transaction()
			.execute(async (tx) =>
				syncAnnotationLinksByParagraphNumber(
					tx,
					annotationPageId,
					new Map(),
					mainPage.id,
				),
			);

		const links = await db
			.selectFrom("segmentAnnotationLinks")
			.selectAll()
			.where("annotationSegmentId", "=", annotationSegments[0].id)
			.execute();
		expect(links).toHaveLength(0);
	});

	it("anchorPageIdがない場合、リンクは作成されない", async () => {
		const { annotationPageId, annotationSegments } =
			await createAnnotationPageWithSegments(["Ann"]);

		await db
			.transaction()
			.execute(async (tx) =>
				syncAnnotationLinksByParagraphNumber(
					tx,
					annotationPageId,
					new Map([["1", [annotationSegments[0].id]]]),
					null,
				),
			);

		const links = await db
			.selectFrom("segmentAnnotationLinks")
			.selectAll()
			.where("annotationSegmentId", "=", annotationSegments[0].id)
			.execute();
		expect(links).toHaveLength(0);
	});

	it("段落番号が一致しない場合、既存リンクは削除され新規リンクは作成されない", async () => {
		const { mainPage } = await createMainPageWithParagraphNumbers(["1"]);
		const { annotationPageId, annotationSegments } =
			await createAnnotationPageWithSegments(["Ann"]);
		const primarySegmentTypeId = await getSegmentTypeId("PRIMARY");

		// 既存リンクを作成
		const extraMainSegment = await db
			.insertInto("segments")
			.values({
				tipitakaPageId: mainPage.id,
				number: 999,
				text: "Extra",
				textAndOccurrenceHash: "hash-extra",
				segmentTypeId: primarySegmentTypeId,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		await db
			.insertInto("segmentAnnotationLinks")
			.values({
				mainSegmentId: extraMainSegment.id,
				annotationSegmentId: annotationSegments[0].id,
			})
			.execute();

		await db
			.transaction()
			.execute(async (tx) =>
				syncAnnotationLinksByParagraphNumber(
					tx,
					annotationPageId,
					new Map([["999", [annotationSegments[0].id]]]),
					mainPage.id,
				),
			);

		const links = await db
			.selectFrom("segmentAnnotationLinks")
			.selectAll()
			.where("annotationSegmentId", "=", annotationSegments[0].id)
			.execute();
		expect(links).toHaveLength(0);
	});

	it("同じ段落番号に複数のアノテーションセグメントがある場合、すべてにリンクが作成される", async () => {
		const { mainPage, mainSegments } = await createMainPageWithParagraphNumbers(
			["1"],
		);
		const { annotationPageId, annotationSegments } =
			await createAnnotationPageWithSegments(["Ann 1", "Ann 2"]);

		const paragraphToAnnotationIds = new Map([
			["1", [annotationSegments[0].id, annotationSegments[1].id]],
		]);

		await db
			.transaction()
			.execute(async (tx) =>
				syncAnnotationLinksByParagraphNumber(
					tx,
					annotationPageId,
					paragraphToAnnotationIds,
					mainPage.id,
				),
			);

		const links = await db
			.selectFrom("segmentAnnotationLinks")
			.selectAll()
			.where(
				"annotationSegmentId",
				"in",
				annotationSegments.map((s) => s.id),
			)
			.execute();
		expect(links).toHaveLength(2);
		expect(links.every((l) => l.mainSegmentId === mainSegments[0].id)).toBe(
			true,
		);
	});

	it("同じ段落番号に複数のPRIMARYセグメントがある場合、最大numberのセグメントがアンカーになる", async () => {
		const { mainPage, mainSegments } = await createMainPageWithParagraphNumbers(
			["1", "1"],
		); // 両方同じ段落番号
		const { annotationPageId, annotationSegments } =
			await createAnnotationPageWithSegments(["Ann"]);

		await db
			.transaction()
			.execute(async (tx) =>
				syncAnnotationLinksByParagraphNumber(
					tx,
					annotationPageId,
					new Map([["1", [annotationSegments[0].id]]]),
					mainPage.id,
				),
			);

		const links = await db
			.selectFrom("segmentAnnotationLinks")
			.selectAll()
			.where("annotationSegmentId", "=", annotationSegments[0].id)
			.execute();
		expect(links).toHaveLength(1);
		expect(links[0].mainSegmentId).toBe(mainSegments[1].id);
	});

	it("最初の段落番号より前のアノテーションは直前のPRIMARYにリンクする", async () => {
		const mainPage = (await createPageWithSegments({
			slug: "main-page-preface",
			segments: [
				{
					number: 0,
					text: "Preface",
					textAndOccurrenceHash: "hash-main-preface",
				},
				{
					number: 1,
					text: "Main segment 1",
					textAndOccurrenceHash: "hash-main-1",
				},
			],
		})) as TipitakaPage;
		const mainSegments = await db
			.selectFrom("segments")
			.selectAll()
			.where("tipitakaPageId", "=", mainPage.id)
			.orderBy("number")
			.execute();

		await addParagraphNumbersToSegments([
			{ segmentId: mainSegments[1].id, paragraphNumber: "1" },
		]);

		const { annotationPageId, annotationSegments } =
			await createAnnotationPageWithSegments(["Ann Preface"]);

		await db
			.transaction()
			.execute(async (tx) =>
				syncAnnotationLinksByParagraphNumber(
					tx,
					annotationPageId,
					new Map(),
					mainPage.id,
					[annotationSegments[0].id],
				),
			);

		const links = await db
			.selectFrom("segmentAnnotationLinks")
			.selectAll()
			.where("annotationSegmentId", "=", annotationSegments[0].id)
			.execute();
		expect(links).toHaveLength(1);
		expect(links[0].mainSegmentId).toBe(mainSegments[0].id);
	});
});
