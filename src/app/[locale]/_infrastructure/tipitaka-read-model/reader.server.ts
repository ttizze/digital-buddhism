import type { PageTreeNode } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_db/queries";
import {
	type HomeBaseSnapshot,
	homeBaseKey,
	homeTranslationKey,
	homeTranslationPointerKey,
	type PageAnnotationsSnapshot,
	type PageBaseSnapshot,
	type PageContentData,
	type PageStateSnapshot,
	pageAnnotationsKey,
	pageBaseKey,
	pageStateKey,
	pageTranslationKey,
	pageTranslationPointerKey,
	type ReadModelKey,
	type TranslationOverlay,
	type TranslationPointer,
} from "./model";
import { getTipitakaReadModelStore } from "./store";

interface TranslatableTreeNode {
	titleSegmentId: number;
	titleTranslationText: string | null;
	children: TranslatableTreeNode[];
}

function applyTreeTranslations(
	nodes: TranslatableTreeNode[],
	translations: Readonly<Record<string, string>>,
): void {
	for (const node of nodes) {
		node.titleTranslationText =
			translations[String(node.titleSegmentId)] ?? null;
		applyTreeTranslations(node.children, translations);
	}
}

async function readPointedTranslationOverlay(
	pointerKey: ReadModelKey<TranslationPointer>,
	keyForRevision: (revision: string) => ReadModelKey<TranslationOverlay>,
	generation: string | undefined,
): Promise<TranslationOverlay | null> {
	const store = getTipitakaReadModelStore();
	const pointerValue = await store.get(pointerKey);
	if (!pointerValue) return null;
	if (generation !== undefined && pointerValue.generation !== generation) {
		return null;
	}
	const currentKey = keyForRevision(pointerValue.revision);
	const currentValue = await store.get(currentKey);
	if (
		currentValue &&
		(generation === undefined || currentValue.generation === generation)
	) {
		return currentValue;
	}
	if (pointerValue.previousRevision) {
		const previousKey = keyForRevision(pointerValue.previousRevision);
		const previousValue = await store.get(previousKey);
		if (
			previousValue &&
			(generation === undefined || previousValue.generation === generation)
		) {
			return previousValue;
		}
	}
	throw new Error(`Tipitaka translation revision not found: ${currentKey}`);
}

function readPageTranslationOverlay(
	pageId: number,
	locale: string,
	generation: string | undefined,
): Promise<TranslationOverlay | null> {
	return readPointedTranslationOverlay(
		pageTranslationPointerKey(pageId, locale),
		(revision) => pageTranslationKey(pageId, locale, revision),
		generation,
	);
}

function readHomeTranslationOverlay(
	locale: string,
	generation: string | undefined,
): Promise<TranslationOverlay | null> {
	return readPointedTranslationOverlay(
		homeTranslationPointerKey(locale),
		(revision) => homeTranslationKey(locale, revision),
		generation,
	);
}

/** 複数ページ分のオーバーレイを読み、segmentId→翻訳テキストの1つのマップへ統合する */
async function collectPageTranslations(
	pageIds: readonly number[],
	locale: string,
	generation: string | undefined,
): Promise<Record<string, string>> {
	const overlays = await Promise.all(
		pageIds.map((pageId) =>
			readPageTranslationOverlay(pageId, locale, generation),
		),
	);
	const translations: Record<string, string> = {};
	for (const overlay of overlays) {
		if (overlay) Object.assign(translations, overlay.translations);
	}
	return translations;
}

function applyAnnotationSegmentTranslations(
	annotations: ReadonlyArray<{
		annotationSegment: { id: number; translationText: string | null };
	}>,
	translations: Readonly<Record<string, string>>,
): void {
	for (const { annotationSegment } of annotations) {
		annotationSegment.translationText =
			translations[String(annotationSegment.id)] ?? null;
	}
}

export async function readHomeData(
	locale: string,
): Promise<HomeBaseSnapshot | null> {
	const store = getTipitakaReadModelStore();
	const baseValue = await store.get(homeBaseKey());
	if (!baseValue) return null;
	const base: HomeBaseSnapshot = baseValue;
	const overlay = await readHomeTranslationOverlay(locale, base.generation);
	applyTreeTranslations(base.tipitakaPages, overlay?.translations ?? {});
	return base;
}

export async function readPageContentData(
	slug: string,
	locale: string,
): Promise<PageContentData | null> {
	const store = getTipitakaReadModelStore();
	const baseKey = pageBaseKey(slug);
	const baseValue = await store.get(baseKey);
	if (!baseValue) return null;
	const base: PageBaseSnapshot = baseValue;
	const [stateValue, translations] = await Promise.all([
		store.get(pageStateKey(base.data.pageDetail.id)),
		collectPageTranslations(base.translationPageIds, locale, base.generation),
	]);

	for (const segment of base.data.pageDetail.segments) {
		segment.translationText = translations[String(segment.id)] ?? null;
		applyAnnotationSegmentTranslations(segment.annotations, translations);
	}
	const titleSegment = base.data.pageDetail.segments.find(
		(segment) => segment.number === 0,
	);
	base.data.pageDetail.title = titleSegment
		? titleSegment.translationText
			? `${titleSegment.text} - ${titleSegment.translationText}`
			: titleSegment.text
		: "";
	if (base.data.navigationData) {
		base.data.navigationData.rootNode.titleTranslationText =
			translations[String(base.data.navigationData.rootNode.titleSegmentId)] ??
			null;
		for (const node of base.data.navigationData.breadcrumb) {
			node.titleTranslationText =
				translations[String(node.titleSegmentId)] ?? null;
		}
	}
	applyTreeTranslations(base.data.childPages, translations);

	const state: PageStateSnapshot | null = stateValue;
	return {
		...base.data,
		completedTranslationLocales:
			state?.completedTranslationLocales ??
			base.data.completedTranslationLocales,
		pageDetail: {
			...base.data.pageDetail,
			createdAt: new Date(base.data.pageDetail.createdAt),
			updatedAt: new Date(base.data.pageDetail.updatedAt),
		},
	};
}

export async function readPageAnnotations(
	slug: string,
	locale: string,
): Promise<PageAnnotationsSnapshot["annotationsByTargetSegmentId"] | null> {
	const store = getTipitakaReadModelStore();
	const key = pageAnnotationsKey(slug);
	const value = await store.get(key);
	if (!value) return null;
	const snapshot: PageAnnotationsSnapshot = value;
	const translations = await collectPageTranslations(
		snapshot.translationPageIds,
		locale,
		snapshot.generation,
	);
	for (const annotations of Object.values(
		snapshot.annotationsByTargetSegmentId,
	)) {
		applyAnnotationSegmentTranslations(annotations, translations);
	}
	return snapshot.annotationsByTargetSegmentId;
}

export async function readPageTree(
	rootPageId: number,
	locale: string,
): Promise<PageTreeNode[] | null> {
	const home = await readHomeData(locale);
	if (!home) return null;
	if (home.rootPageId === rootPageId) {
		return home.tipitakaPages;
	}

	const pending = [...home.tipitakaPages];
	while (pending.length > 0) {
		const node = pending.pop();
		if (!node) break;
		if (node.id === rootPageId) return node.children;
		pending.push(...node.children);
	}
	return [];
}
