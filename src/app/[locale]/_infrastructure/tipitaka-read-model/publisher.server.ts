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
	TIPITAKA_READ_MODEL_SCHEMA_VERSION,
	type TranslationOverlay,
	type TranslationPointer,
} from "./model";
import {
	queryBestTranslationTextsForPage,
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

function collectTreePageIds(
	nodes: readonly TranslatableTreeNode[],
	pageIds: Set<number>,
): void {
	for (const node of nodes) {
		pageIds.add(node.id);
		collectTreePageIds(node.children, pageIds);
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
	key: string,
): Promise<string | undefined> {
	const value = await store.get(key);
	if (!value) return undefined;
	const pointer = JSON.parse(value) as Partial<TranslationPointer>;
	return pointer.schemaVersion === TIPITAKA_READ_MODEL_SCHEMA_VERSION &&
		typeof pointer.revision === "string"
		? pointer.revision
		: undefined;
}

export async function publishPageBase(
	slug: string,
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	const pageDetail = await queryPageDetail(slug, READ_MODEL_SOURCE_LOCALE);
	if (!pageDetail) throw new Error(`Tipitaka page not found: ${slug}`);

	const data = await loadPageContentData(pageDetail, READ_MODEL_SOURCE_LOCALE);
	const translationPageIds = new Set<number>([pageDetail.id]);
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
		translationPageIds.add(data.navigationData.rootNode.id);
		for (const node of data.navigationData.breadcrumb) {
			node.titleTranslationText = null;
			translationPageIds.add(node.id);
		}
	}
	clearTreeTranslations(data.childPages);
	collectTreePageIds(data.childPages, translationPageIds);

	const generatedAt = new Date().toISOString();
	const snapshot: PageBaseSnapshot = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		generatedAt,
		translationPageIds: [...translationPageIds].sort(
			(left, right) => left - right,
		),
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
		translationPageIds: [...annotationTranslationPageIds].sort(
			(left, right) => left - right,
		),
		annotationTypes: data.annotationTypes,
		annotationsByTargetSegmentId,
	};
	await store.put(pageBaseKey(slug), JSON.stringify(snapshot));
	await store.put(pageAnnotationsKey(slug), JSON.stringify(annotations));
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
	await store.put(pageStateKey(pageId), JSON.stringify(snapshot));
}

export async function publishPageTranslationOverlay(
	pageId: number,
	locale: string,
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	const revision = crypto.randomUUID();
	const pointerKey = pageTranslationPointerKey(pageId, locale);
	const [previousRevision, translations] = await Promise.all([
		readCurrentTranslationRevision(store, pointerKey),
		queryBestTranslationTextsForPage(pageId, locale),
	]);
	const snapshot: TranslationOverlay = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		generatedAt: new Date().toISOString(),
		locale,
		translations,
	};
	const pointer: TranslationPointer = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		revision,
		previousRevision,
	};
	await store.put(
		pageTranslationKey(pageId, locale, revision),
		JSON.stringify(snapshot),
	);
	await store.put(pointerKey, JSON.stringify(pointer));
}

export async function publishHomeBase(
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
		rootPageId,
		tipitakaPages,
	};
	await store.put(homeBaseKey(), JSON.stringify(snapshot));
}

export async function publishHomeTranslationOverlay(
	locale: string,
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	const revision = crypto.randomUUID();
	const pointerKey = homeTranslationPointerKey(locale);
	const [tree, previousRevision] = await Promise.all([
		fetchTipitakaPageTree(locale),
		readCurrentTranslationRevision(store, pointerKey),
	]);
	const translations: Record<string, string> = {};
	collectTreeTranslations(tree, translations);
	const snapshot: TranslationOverlay = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		generatedAt: new Date().toISOString(),
		locale,
		translations,
	};
	const pointer: TranslationPointer = {
		schemaVersion: TIPITAKA_READ_MODEL_SCHEMA_VERSION,
		revision,
		previousRevision,
	};
	await store.put(
		homeTranslationKey(locale, revision),
		JSON.stringify(snapshot),
	);
	await store.put(pointerKey, JSON.stringify(pointer));
}

export async function publishTipitakaProjection(
	pageId: number,
	locale: string,
	store: TipitakaReadModelStore = getTipitakaReadModelStore(),
): Promise<void> {
	await Promise.all([
		publishPageTranslationOverlay(pageId, locale, store),
		publishPageState(pageId, store),
		publishHomeTranslationOverlay(locale, store),
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

	await publishHomeBase(serializedStore);
	await runPublishPhase(
		pages.flatMap((page) => [
			() => publishPageBase(page.slug, serializedStore),
			() => publishPageState(page.id, serializedStore),
		]),
	);
	await runPublishPhase(
		translationPageLocales.map(
			(item) => () =>
				publishPageTranslationOverlay(
					item.pageId,
					item.locale,
					serializedStore,
				),
		),
	);
	await runPublishPhase(
		locales.map(
			(locale) => () => publishHomeTranslationOverlay(locale, serializedStore),
		),
	);
}
