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

	it("表示中の子孫だけをposition順に取得し採用済みタイトル訳を返す", async () => {
		const curator = await createUser({ handle: "evame" });
		const translator = await createUser({ handle: "translator" });
		const root = await createPage({ slug: "tipitaka", kind: "ROOT" });
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
		const hiddenParent = await createPage({
			slug: "hidden-parent",
			kind: "CATEGORY",
			parentId: root.id,
			isVisible: false,
		});
		await createPage({
			slug: "hidden-child",
			parentId: hiddenParent.id,
			isVisible: true,
		});

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
		expect(tree.some((page) => page.slug === "hidden-parent")).toBe(false);
		expect(tree.some((page) => page.slug === "hidden-child")).toBe(false);
	});
});
