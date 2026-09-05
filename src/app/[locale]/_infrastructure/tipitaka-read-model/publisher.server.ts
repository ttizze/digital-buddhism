import pLimit from "p-limit";
import { queryPageDetail } from "@/app/[locale]/_db/queries";
import { fetchTipitakaPageTree } from "@/app/[locale]/(common-layout)/_components/tipitaka-page-list/db/queries";
import { queryCompletedTranslationLocales } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_db/queries";
import { loadPageContentData } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/load-page-content-data";
import {
	type HomeBaseSnapshot,
	homeBaseKey,
	homeTranslationKey,
	homeTranslationPointerKey,
	type PageAnnotationsSnapshot,
	type PageBaseSnapshot,
	type PageStateSnapshot,
	pageAnnotationsKey,
	pageBaseKey,
	pageStateKey,
	pageTranslationKey,
	pageTranslationPointerKey,
	type ReadModelKey,
	TIPITAKA_READ_MODEL_SCHEMA_VERSION,
	type TranslationOverlay,
	type TranslationPointer,
} from "./model";
import {
	queryBestTranslationTextsForPage,
	querySelectedGlossUnitsForPage,
	queryReadModelPages,
	queryTipitakaRootPageId,
	queryTranslationLocales,
	queryTranslationPageLocales,
} from "./queries.server";
import {
	getTipitakaReadModelStore,
	type TipitakaReadModelStore,
} from "./store";

type TranslatableTreeNode = {
	id: number;
	titleSegmentId: number;
	titleTranslationText: string | null;
	children: TranslatableTreeNode[];
};

const READ_MODEL_SOURCE_LOCALE = "__tipitaka_source__";
const PUBLISH_CONCURRENCY = 5;

type PublishTask = () => Promise<void>;

function serializeStoreWrites(
	store: TipitakaReadModelStore,
): TipitakaReadModelStore {
	let writeQueue: Promise<void> = Promise.resolve();
	return {
		get: (key) => store.get(key),
		put: (key, value) => {
			writeQueue = writeQueue.then(() => store.put(key, value));
			return writeQueue;
		},
	};
}

async function runPublishPhase(tasks: PublishTask[]): Promise<void> {
	const limit = pLimit(PUBLISH_CONCURRENCY);
	const results = await Promise.allSettled(tasks.map((task) => limit(task)));
	const failure = results.find(
		(result): result is PromiseRejectedResult => result.status === "rejected",
	);
	if (failure) throw failure.reason;
}

function clearTreeTranslations(nodes: TranslatableTreeNode[]): void {
	for (const node of nodes) {
		node.titleTranslationText = null;
		clearTreeTranslations(node.children);
	}
}

function collectTreeTranslations(
	nodes: readonly TranslatableTreeNode[],
	translations: Record<string, string>,
): void {
	for (const node of nodes) {
		if (node.titleTranslationText !== null) {
			translations[String(node.titleSegmentId)] = node.titleTranslationText;
		}
		collectTreeTranslations(node.children, translations);
	}
}

async function readCurrentTranslationRevision(
	store: TipitakaReadModelStore,
	key: ReadModelKey<TranslationPointer>,
	generation: string | undefined,
): Promise<string | undefined> {
	const pointer = await store.get(key);
	if (generation !== undefined && pointer?.generation !== generation) {
		return undefined;
	}
	return pointer?.revision;
}

/**
 * 新リビジョンのオーバーレイを書き、ポインタを差し替える。
 * reader 側の readPointedTranslationOverlay と対になる書き込みヘルパー。
 */
async function writeTranslationOverlay({
	store,
	pointerKey,
	keyForRevision,
	locale,
	generation,
	loadOverlay,
}: {
	store: TipitakaReadModelStore;
	pointerKey: ReadModelKey<TranslationPointer>;
	keyForRevision: (revision: string) => ReadModelKey<TranslationOverlay>;
	locale: string;
	generation: string | undefined;
	loadOverlay: () => Promise<
		Pick<TranslationOverlay, "translations" | "glossUnits">
	>;
}): Promise<void> {
	const revision = crypto.randomUUID();
	const [previousRevision, overlay] = await Promise.all([
		readCurrentTranslationRevision(store, pointerKey, generation),
		loadOverlay(),
	]);
	const snapshot: TranslationOverlay = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		generatedAt: new Date().toISOString(),
		generation,
		locale,
		...overlay,
	};
	const pointer: TranslationPointer = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		generation,
		revision,
		previousRevision,
	};
	await store.put(keyForRevision(revision), snapshot);
	await store.put(pointerKey, pointer);
}

export async function publishPageBase(
	slug: string,
	generation: string,
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	const pageDetail = await queryPageDetail(slug, READ_MODEL_SOURCE_LOCALE);
	if (!pageDetail) throw new Error(`Tipitaka page not found: ${slug}`);

	const data = await loadPageContentData(pageDetail, READ_MODEL_SOURCE_LOCALE);
	const annotationTranslationPageIds = new Set<number>();
	const annotationsByTargetSegmentId: PageAnnotationsSnapshot["annotationsByTargetSegmentId"] =
		{};
	for (const segment of pageDetail.segments) {
		segment.translationText = null;
		if (segment.annotations.length > 0) {
			annotationsByTargetSegmentId[String(segment.id)] = segment.annotations;
		}
		for (const { annotationSegment } of segment.annotations) {
			annotationSegment.translationText = null;
			annotationTranslationPageIds.add(annotationSegment.pageId);
		}
		segment.annotations = [];
	}
	if (data.navigationData) {
		data.navigationData.rootNode.titleTranslationText = null;
		for (const node of data.navigationData.breadcrumb) {
			node.titleTranslationText = null;
		}
	}
	clearTreeTranslations(data.childPages);

	const generatedAt = new Date().toISOString();
	const snapshot: PageBaseSnapshot = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		generatedAt,
		generation,
		data: {
			...data,
			completedTranslationLocales: [],
			pageDetail: {
				...pageDetail,
				createdAt: pageDetail.createdAt.getTime(),
				updatedAt: pageDetail.updatedAt.getTime(),
			},
		},
	};
	const annotations: PageAnnotationsSnapshot = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		generatedAt,
		generation,
		translationPageIds: [...annotationTranslationPageIds].sort(
			(left, right) => left - right,
		),
		annotationTypes: data.annotationTypes,
		annotationsByTargetSegmentId,
	};
	await store.put(pageBaseKey(slug), snapshot);
	await store.put(pageAnnotationsKey(slug), annotations);
}

export async function publishPageState(
	pageId: number,
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	const snapshot: PageStateSnapshot = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		generatedAt: new Date().toISOString(),
		completedTranslationLocales: await queryCompletedTranslationLocales(pageId),
	};
	await store.put(pageStateKey(pageId), snapshot);
}

export async function publishPageTranslationOverlay(
	pageId: number,
	locale: string,
	generation: string | undefined,
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	await writeTranslationOverlay({
		store,
		pointerKey: pageTranslationPointerKey(pageId, locale),
		keyForRevision: (revision) => pageTranslationKey(pageId, locale, revision),
		locale,
		generation,
		loadOverlay: async () => {
			const [translations, glossUnits] = await Promise.all([
				queryBestTranslationTextsForPage(pageId, locale),
				querySelectedGlossUnitsForPage(pageId, locale),
			]);
			return { translations, glossUnits };
		},
	});
}

export async function publishHomeBase(
	generation: string,
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	const [rootPageId, tipitakaPages] = await Promise.all([
		queryTipitakaRootPageId(),
		fetchTipitakaPageTree(READ_MODEL_SOURCE_LOCALE),
	]);
	if (rootPageId === null) throw new Error("Tipitaka root page not found");
	clearTreeTranslations(tipitakaPages);
	const snapshot: HomeBaseSnapshot = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		generatedAt: new Date().toISOString(),
		generation,
		rootPageId,
		tipitakaPages,
	};
	await store.put(homeBaseKey(), snapshot);
}

export async function publishHomeTranslationOverlay(
	locale: string,
	generation: string | undefined,
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	await writeTranslationOverlay({
		store,
		pointerKey: homeTranslationPointerKey(locale),
		keyForRevision: (revision) => homeTranslationKey(locale, revision),
		locale,
		generation,
		loadOverlay: async () => {
			const tree = await fetchTipitakaPageTree(locale);
			const translations: Record<string, string> = {};
			collectTreeTranslations(tree, translations);
			return { translations, glossUnits: [] };
		},
	});
}

export async function publishTipitakaProjection(
	pageId: number,
	locale: string,
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	const home = await store.get(homeBaseKey());
	const generation = home?.generation;
	await Promise.all([
		publishPageTranslationOverlay(pageId, locale, generation, store),
		publishPageState(pageId, store),
		publishHomeTranslationOverlay(locale, generation, store),
	]);
}

export async function publishAllTipitakaReadModels(
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	const [pages, translationPageLocales, locales] = await Promise.all([
		queryReadModelPages(),
		queryTranslationPageLocales(),
		queryTranslationLocales(),
	]);
	const serializedStore = serializeStoreWrites(store);
	const generation = crypto.randomUUID();

	await publishHomeBase(generation, serializedStore);
	await runPublishPhase(
		pages.flatMap((page) => [
			() => publishPageBase(page.slug, generation, serializedStore),
			() => publishPageState(page.id, serializedStore),
		]),
	);
	await runPublishPhase(
		translationPageLocales.map(
			(item) => () =>
				publishPageTranslationOverlay(
					item.pageId,
					item.locale,
					generation,
					serializedStore,
				),
		),
	);
	await runPublishPhase(
		locales.map(
			(locale) => () =>
				publishHomeTranslationOverlay(locale, generation, serializedStore),
		),
	);
}
