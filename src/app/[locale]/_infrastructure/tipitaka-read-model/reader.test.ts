import { expect, it } from "vite-plus/test";
import {
	pageBaseKey,
	pageTranslationPointerKey,
	pageTranslationKey,
	TIPITAKA_READ_MODEL_SCHEMA_VERSION,
	type PageBaseSnapshot,
} from "./model";
import { readPageContentData } from "./reader.server";
import { createKvReadModelStore, runWithTipitakaReadModelStore } from "./store";

function createDeferredPageStore() {
	const root = {
		id: 1,
		slug: "tipitaka",
		parentId: null,
		position: 0,
		titleSegmentId: 10,
		titleText: "Tipitaka",
		titleTranslationText: null,
	};
	const page: PageBaseSnapshot = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		generatedAt: "2026-01-01",
		generation: "test",
		data: {
			pageDetail: {
				id: 2,
				slug: "article",
				title: "Article",
				textLevel: "MULA",
				parentId: 1,
				position: 0,
				createdAt: 0,
				updatedAt: 0,
				mdastJson: { type: "root", children: [] },
				segments: [
					{
						id: 20,
						pageId: 2,
						number: 0,
						text: "Article",
						translationText: null,
						textLevel: "MULA",
						annotations: [],
					},
				],
			},
			navigationData: { rootNode: root, breadcrumb: [root] },
			childPages: [],
			completedTranslationLocales: [],
			description: "Article description",
			annotationTypes: [],
		},
	};
	const values = new Map<string, string>([
		[pageBaseKey("article"), JSON.stringify(page)],
		[
			pageTranslationPointerKey(2, "ja"),
			JSON.stringify({
				schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
				generation: "test",
				revision: "r1",
			}),
		],
		[
			pageTranslationKey(2, "ja", "r1"),
			JSON.stringify({
				schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
				generation: "test",
				locale: "ja",
				generatedAt: "2026-01-01",
				translations: { "20": "記事" },
				glossUnits: [],
			}),
		],
	]);
	const gate = Promise.withResolvers<void>();
	const reads: string[] = [];
	const store = createKvReadModelStore({
		get: async (key) => {
			reads.push(key);
			if (key === pageTranslationPointerKey(1, "ja")) await gate.promise;
			return values.get(key) ?? null;
		},
		put: async (key, value) => {
			values.set(key, value);
		},
	});
	return { store, gate, reads };
}

it("ルート翻訳を待たず翻訳済みメタデータを返し、解決後に本文を返す", async () => {
	const { store, gate, reads } = createDeferredPageStore();
	try {
		const result = await runWithTipitakaReadModelStore(store, () =>
			readPageContentData("article", "ja"),
		);
		expect(result?.metadata.pageDetail).toEqual({
			slug: "article",
			title: "Article - 記事",
		});
		if (!result) throw new Error("Page not found");
		let settled = false;
		void result.content.then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);
		gate.resolve();
		const content = await result.content;
		expect(content.pageDetail.title).toBe(result.metadata.pageDetail.title);
		expect(content.pageDetail.segments[0]?.translationText).toBe("記事");
		expect(content.pageDetail.createdAt).toBeInstanceOf(Date);
		expect(new Set(reads).size).toBe(reads.length);
	} finally {
		gate.resolve();
	}
});

it("遅延取得の失敗を本文Promiseから伝える", async () => {
	const { store, gate } = createDeferredPageStore();
	try {
		const result = await runWithTipitakaReadModelStore(store, () =>
			readPageContentData("article", "ja"),
		);
		if (!result) throw new Error("Page not found");
		const rejected = expect(result.content).rejects.toThrow(
			"Root translation unavailable",
		);
		gate.reject(new Error("Root translation unavailable"));
		await rejected;
	} finally {
		gate.resolve();
	}
});

it("存在しない記事は本文Promiseを作らずnullを返す", async () => {
	const { store, gate } = createDeferredPageStore();
	try {
		await expect(
			runWithTipitakaReadModelStore(store, () =>
				readPageContentData("missing", "ja"),
			),
		).resolves.toBeNull();
	} finally {
		gate.resolve();
	}
});
