import { beforeEach, describe, expect, it } from "vite-plus/test";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPageWithAnnotations,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { projectPendingTipitakaReadModels } from "./jobs.server";
import { pageTranslationKey, pageTranslationPointerKey } from "./model";
import {
	publishAllTipitakaReadModels,
	publishHomeBase,
	publishHomeTranslationOverlay,
	publishPageBase,
	publishPageState,
	publishPageTranslationOverlay,
} from "./publisher.server";
import {
	readHomeData,
	readPageAnnotations,
	readPageContentData,
} from "./reader.server";
import { createKvReadModelStore, runWithTipitakaReadModelStore } from "./store";

await setupDbPerFile(import.meta.url);

const values = new Map<string, string>();
const generation = "test-generation";
const store = createKvReadModelStore({
	get: async (key) => values.get(key) ?? null,
	put: async (key, value) => {
		values.set(key, value);
	},
});

describe("Tipitaka read model", () => {
	beforeEach(async () => {
		values.clear();
		await resetDatabase();
	});

	it("本文とlocale別翻訳を別snapshotから再構成する", async () => {
		const translator = await createUser({ handle: "translator" });
		const root = await createPageWithSegments({
			slug: "tipitaka",
			textLevel: null,
			mdastJson: { type: "root", children: [] },
			segments: [
				{ number: 0, text: "Tipitaka", textAndOccurrenceHash: "root-title" },
			],
		});
		const page = await createPageWithSegments({
			slug: "read-model-page",
			parentId: root.id,
			mdastJson: {
				type: "root",
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", value: "Source text" }],
					},
				],
			},
			segments: [
				{ number: 0, text: "Source title", textAndOccurrenceHash: "title" },
				{ number: 1, text: "Source text", textAndOccurrenceHash: "body" },
			],
		});
		const segments = await db
			.selectFrom("segments")
			.select(["id", "number"])
			.where("tipitakaPageId", "=", page.id)
			.orderBy("number")
			.execute();
		await db
			.insertInto("segmentTranslations")
			.values(
				segments.map((segment) => ({
					segmentId: segment.id,
					locale: "ja",
					text: segment.number === 0 ? "翻訳題" : "翻訳本文",
					userId: translator.id,
				})),
			)
			.execute();

		await Promise.all([
			publishHomeBase(generation, store),
			publishPageBase(page.slug, generation, store),
			publishPageState(page.id, store),
		]);
		await Promise.all([
			publishHomeTranslationOverlay("ja", generation, store),
			publishPageTranslationOverlay(page.id, "ja", generation, store),
		]);

		const [home, content] = await runWithTipitakaReadModelStore(store, () =>
			Promise.all([
				readHomeData("ja"),
				readPageContentData(page.slug, "ja").then((page) => page?.content),
			]),
		);
		expect(home?.tipitakaPages[0]?.titleTranslationText).toBe("翻訳題");
		expect(content?.pageDetail.title).toBe("Source title - 翻訳題");
		expect(content?.pageDetail.segments[1]?.translationText).toBe("翻訳本文");
		expect(content?.pageDetail.createdAt).toBeInstanceOf(Date);

		const bodySegment = segments.find((segment) => segment.number === 1);
		if (!bodySegment) throw new Error("Body segment not found");
		await db
			.updateTable("segmentTranslations")
			.set({ text: "新しい翻訳本文" })
			.where("segmentId", "=", bodySegment.id)
			.execute();
		await publishPageTranslationOverlay(page.id, "ja", generation, store);
		const pointerKey = pageTranslationPointerKey(page.id, "ja");
		const pointer = await store.get(pointerKey);
		if (!pointer) throw new Error("Translation pointer not found");
		expect(pointer.previousRevision).toBeTypeOf("string");
		values.delete(pageTranslationKey(page.id, "ja", pointer.revision));

		const contentDuringPropagation = await runWithTipitakaReadModelStore(
			store,
			() => readPageContentData(page.slug, "ja").then((page) => page?.content),
		);
		expect(
			contentDuringPropagation?.pageDetail.segments[1]?.translationText,
		).toBe("翻訳本文");
	});

	it("注釈本文を初期本文から分離して要求時に取得する", async () => {
		const { targetPage } = await createPageWithAnnotations({
			targetPageSlug: "lazy-annotations",
			targetPageSegments: [
				{ number: 0, text: "Title", textAndOccurrenceHash: "lazy-title" },
				{ number: 1, text: "Body", textAndOccurrenceHash: "lazy-body" },
			],
			annotationSegments: [
				{
					number: 1,
					text: "Commentary",
					textAndOccurrenceHash: "lazy-commentary",
					linkedToTargetSegmentNumber: 1,
				},
			],
		});
		await publishPageBase(targetPage.slug, generation, store);

		const [content, annotations] = await runWithTipitakaReadModelStore(
			store,
			() =>
				Promise.all([
					readPageContentData(targetPage.slug, "ja").then(
						(page) => page?.content,
					),
					readPageAnnotations(targetPage.slug, "ja"),
				]),
		);

		expect(content?.pageDetail.segments[1]?.annotations).toEqual([]);
		expect(
			annotations?.[String(content?.pageDetail.segments[1]?.id)]?.[0]
				?.annotationSegment.text,
		).toBe("Commentary");
	});

	it("翻訳更新triggerが再生成jobを登録する", async () => {
		const translator = await createUser({ handle: "translator" });
		const page = await createPageWithSegments({
			slug: "queued-page",
			segments: [
				{ number: 0, text: "Title", textAndOccurrenceHash: "queued-title" },
			],
		});
		const segment = await db
			.selectFrom("segments")
			.select("id")
			.where("tipitakaPageId", "=", page.id)
			.executeTakeFirstOrThrow();

		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "翻訳",
				userId: translator.id,
			})
			.execute();

		await expect(
			db
				.selectFrom("tipitakaReadModelJobs")
				.select(["pageId", "locale"])
				.executeTakeFirst(),
		).resolves.toEqual({ pageId: page.id, locale: "ja" });

		await expect(
			runWithTipitakaReadModelStore(store, () =>
				projectPendingTipitakaReadModels(),
			),
		).resolves.toBe(1);
		await expect(
			db
				.selectFrom("tipitakaReadModelJobs")
				.select("pageId")
				.executeTakeFirst(),
		).resolves.toBeUndefined();
	});

	it("全read model生成でstore書き込みを直列化する", async () => {
		const root = await createPageWithSegments({
			slug: "tipitaka",
			textLevel: null,
			mdastJson: { type: "root", children: [] },
			segments: [
				{ number: 0, text: "Tipitaka", textAndOccurrenceHash: "root-title" },
			],
		});
		await createPageWithSegments({
			slug: "serialized-publish",
			parentId: root.id,
			mdastJson: { type: "root", children: [] },
			segments: [
				{ number: 0, text: "Page", textAndOccurrenceHash: "page-title" },
			],
		});
		let activePuts = 0;
		let maxActivePuts = 0;
		const delayedStore = createKvReadModelStore({
			get: async (key) => values.get(key) ?? null,
			put: async (key, value) => {
				activePuts += 1;
				maxActivePuts = Math.max(maxActivePuts, activePuts);
				try {
					await new Promise((resolve) => setTimeout(resolve, 1));
					values.set(key, value);
				} finally {
					activePuts -= 1;
				}
			},
		});

		await publishAllTipitakaReadModels(delayedStore);

		expect(maxActivePuts).toBe(1);
	});

	it("全read model再生成後は前世代の翻訳を適用しない", async () => {
		const translator = await createUser({ handle: "stale-translator" });
		const root = await createPageWithSegments({
			slug: "tipitaka",
			textLevel: null,
			mdastJson: { type: "root", children: [] },
			segments: [
				{ number: 0, text: "Tipitaka", textAndOccurrenceHash: "root-title" },
			],
		});
		const segment = await db
			.selectFrom("segments")
			.select("id")
			.where("tipitakaPageId", "=", root.id)
			.executeTakeFirstOrThrow();
		await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "古い翻訳",
				userId: translator.id,
			})
			.execute();

		await publishAllTipitakaReadModels(store);
		await db.deleteFrom("segmentTranslations").execute();
		await publishAllTipitakaReadModels(store);

		const content = await runWithTipitakaReadModelStore(store, () =>
			readPageContentData(root.slug, "ja").then((page) => page?.content),
		);
		expect(content?.pageDetail.segments[0]?.translationText).toBeNull();
	});
	it("祖先・子孫の題名を保ち、子孫数によらず通常8回のKV読み取りで記事を返す", async () => {
		const translator = await createUser({ handle: "tree-translator" });
		const makePage = (slug: string, parentId: number | null) =>
			createPageWithSegments({
				slug,
				parentId,
				textLevel: null,
				segments: [{ number: 0, text: slug, textAndOccurrenceHash: slug }],
			});
		const root = await makePage("tipitaka", null);
		const ancestor = await makePage("ancestor", root.id);
		const page = await makePage("category", ancestor.id);
		for (let i = 0; i < 20; i++) await makePage(`child-${i}`, page.id);
		const segments = await db
			.selectFrom("segments")
			.select(["id", "text"])
			.execute();
		await db
			.insertInto("segmentTranslations")
			.values(
				segments.map((segment) => ({
					segmentId: segment.id,
					locale: "ja",
					text: `訳-${segment.text}`,
					userId: translator.id,
				})),
			)
			.execute();
		await publishAllTipitakaReadModels(store);
		const keys: string[] = [];
		const countedStore = createKvReadModelStore({
			get: async (key) => {
				keys.push(key);
				return values.get(key) ?? null;
			},
			put: async () => {
				throw new Error("Read only");
			},
		});
		const content = await runWithTipitakaReadModelStore(
			countedStore,
			async () => (await readPageContentData(page.slug, "ja"))?.content,
		);
		expect(keys).toHaveLength(8);
		expect(content?.pageDetail.title).toBe("category - 訳-category");
		expect(content?.navigationData?.rootNode.titleTranslationText).toBe(
			"訳-tipitaka",
		);
		expect(content?.navigationData?.breadcrumb).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ titleTranslationText: "訳-ancestor" }),
			]),
		);
		expect(content?.childPages).toHaveLength(20);
		expect(
			content?.childPages.every(
				(child) => child.titleTranslationText === `訳-${child.slug}`,
			),
		).toBe(true);
	});

	it("翻訳がない言語でも選択語義を公開し、編集・得票・選択削除をprojectionへ反映する", async () => {
		const author = await createUser({ handle: "gloss-publisher" });
		const page = await createPageWithSegments({
			slug: "tipitaka",
			segments: [
				{ number: 0, text: "Dhamma", textAndOccurrenceHash: "gloss-title" },
			],
		});
		const segment = await db
			.selectFrom("segments")
			.select("id")
			.where("tipitakaPageId", "=", page.id)
			.executeTakeFirstOrThrow();
		const set = await db
			.insertInto("segmentGlossSets")
			.values({ segmentId: segment.id, locale: "ja", userId: author.id })
			.returning("id")
			.executeTakeFirstOrThrow();
		const unit = await db
			.insertInto("segmentGlossUnits")
			.values({
				glossSetId: set.id,
				position: 0,
				startOffset: 0,
				endOffset: 6,
				surface: "Dhamma",
				gloss: "法",
			})
			.returning("id")
			.executeTakeFirstOrThrow();
		await db
			.insertInto("selectedSegmentGlossSets")
			.values({ segmentId: segment.id, locale: "ja", glossSetId: set.id })
			.execute();
		await db
			.insertInto("segmentGlossUnitVotes")
			.values({ glossUnitId: unit.id, userId: author.id, isUpvote: true })
			.execute();
		await publishAllTipitakaReadModels(store);
		const read = () =>
			runWithTipitakaReadModelStore(
				store,
				async () => (await readPageContentData(page.slug, "ja"))?.content,
			);
		expect((await read())?.pageDetail.segments[0]?.glossUnits).toEqual([
			expect.objectContaining({ gloss: "法", currentUserVoteIsUpvote: null }),
		]);
		await db.deleteFrom("tipitakaReadModelJobs").execute();
		await db
			.updateTable("segmentGlossUnits")
			.set({ gloss: "教え", point: 2 })
			.where("id", "=", unit.id)
			.execute();
		expect(
			await runWithTipitakaReadModelStore(store, () =>
				projectPendingTipitakaReadModels(),
			),
		).toBe(1);
		expect((await read())?.pageDetail.segments[0]?.glossUnits).toEqual([
			expect.objectContaining({
				gloss: "教え",
				point: 2,
				currentUserVoteIsUpvote: null,
			}),
		]);
		await db.deleteFrom("selectedSegmentGlossSets").execute();
		expect(
			await runWithTipitakaReadModelStore(store, () =>
				projectPendingTipitakaReadModels(),
			),
		).toBe(1);
		expect((await read())?.pageDetail.segments[0]?.glossUnits).toBeUndefined();
	});
});
