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
			publishHomeBase(store),
			publishPageBase(page.slug, store),
			publishPageState(page.id, store),
		]);
		await Promise.all([
			publishHomeTranslationOverlay("ja", store),
			publishPageTranslationOverlay(page.id, "ja", store),
		]);

		const [home, content] = await runWithTipitakaReadModelStore(store, () =>
			Promise.all([readHomeData("ja"), readPageContentData(page.slug, "ja")]),
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
		await publishPageTranslationOverlay(page.id, "ja", store);
		const pointerKey = pageTranslationPointerKey(page.id, "ja");
		const pointer = await store.get(pointerKey);
		if (!pointer) throw new Error("Translation pointer not found");
		expect(pointer.previousRevision).toBeTypeOf("string");
		values.delete(pageTranslationKey(page.id, "ja", pointer.revision));

		const contentDuringPropagation = await runWithTipitakaReadModelStore(
			store,
			() => readPageContentData(page.slug, "ja"),
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
		await publishPageBase(targetPage.slug, store);

		const [content, annotations] = await runWithTipitakaReadModelStore(
			store,
			() =>
				Promise.all([
					readPageContentData(targetPage.slug, "ja"),
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
});
