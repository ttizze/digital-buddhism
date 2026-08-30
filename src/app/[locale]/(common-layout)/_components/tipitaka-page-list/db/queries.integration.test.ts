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

	it("子孫をposition順に取得し採用済みタイトル訳を返す", async () => {
		const curator = await createUser({ handle: "evame" });
		const translator = await createUser({ handle: "translator" });
		const root = await createPage({ slug: "tipitaka", textLevel: null });
		const second = await createPage({
			slug: "second",
			parentId: root.id,
			position: 2,
		});
		const first = await createPage({
			slug: "first",
			parentId: root.id,
			position: 1,
		});

		const firstTitle = await createSegment({
			pageId: first.id,
			number: 0,
			text: "paṭhama",
			textAndOccurrenceHash: "first-title",
		});
		await createSegment({
			pageId: second.id,
			number: 0,
			text: "dutiya",
			textAndOccurrenceHash: "second-title",
		});
		const selected = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: firstTitle.id,
				locale: "ja",
				text: "第一",
				point: 0,
				userId: translator.id,
			})
			.returningAll()
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
			.insertInto("selectedSegmentTranslations")
			.values({
				segmentId: selected.segmentId,
				locale: selected.locale,
				translationId: selected.id,
				selectedByUserId: curator.id,
			})
			.execute();

		const tree = await fetchTipitakaPageTree("ja");
		expect(tree.map((page) => page.slug)).toEqual(["first", "second"]);
		expect(tree[0]?.titleTranslationText).toBe("第一");
	});
});
