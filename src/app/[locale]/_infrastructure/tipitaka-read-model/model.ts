import type { SegmentGlossUnit } from "@/app/api/segment-glosses/_domain/segment-glosses";
import type { TipitakaPageTreeNode } from "@/app/[locale]/(common-layout)/_components/tipitaka-page-list/domain/extract-tipitaka-page-tree";
import type { PageContentData } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/load-page-content-data";
import type { PageDetail } from "@/app/[locale]/types";

export type { PageContentData };

export const TIPITAKA_READ_MODEL_SCHEMA_VERSION = 2;

type SerializedPageDetail = Omit<PageDetail, "createdAt" | "updatedAt"> & {
	createdAt: number;
	updatedAt: number;
};

export type PageBaseSnapshot = {
	schemaVersion: typeof TIPITAKA_READ_MODEL_SCHEMA_VERSION;
	generatedAt: string;
	generation?: string;
	data: Omit<PageContentData, "pageDetail"> & {
		pageDetail: SerializedPageDetail;
	};
};

export type PageStateSnapshot = {
	schemaVersion: typeof TIPITAKA_READ_MODEL_SCHEMA_VERSION;
	generatedAt: string;
	completedTranslationLocales: string[];
};

export type PageAnnotationsSnapshot = {
	schemaVersion: typeof TIPITAKA_READ_MODEL_SCHEMA_VERSION;
	generatedAt: string;
	generation?: string;
	translationPageIds: number[];
	annotationTypes: PageContentData["annotationTypes"];
	annotationsByTargetSegmentId: Record<
		string,
		PageDetail["segments"][number]["annotations"]
	>;
};

export type HomeBaseSnapshot = {
	schemaVersion: typeof TIPITAKA_READ_MODEL_SCHEMA_VERSION;
	generatedAt: string;
	generation?: string;
	rootPageId: number;
	tipitakaPages: TipitakaPageTreeNode[];
};

export type TranslationOverlay = {
	schemaVersion: typeof TIPITAKA_READ_MODEL_SCHEMA_VERSION;
	generatedAt: string;
	generation?: string;
	locale: string;
	translations: Record<string, string>;
	glossUnits: Omit<SegmentGlossUnit, "currentUserVoteIsUpvote">[];
};

export type TranslationPointer = {
	schemaVersion: typeof TIPITAKA_READ_MODEL_SCHEMA_VERSION;
	generation?: string;
	revision: string;
	previousRevision?: string;
};

export type TipitakaReadModelSnapshot =
	| PageBaseSnapshot
	| PageStateSnapshot
	| PageAnnotationsSnapshot
	| HomeBaseSnapshot
	| TranslationOverlay
	| TranslationPointer;

declare const snapshotType: unique symbol;
export type ReadModelKey<Snapshot extends TipitakaReadModelSnapshot> =
	string & {
		readonly [snapshotType]: Snapshot;
	};

function readModelKey<Snapshot extends TipitakaReadModelSnapshot>(
	value: string,
): ReadModelKey<Snapshot> {
	// SAFETY: The brand only associates a deterministic namespaced key with its snapshot contract; runtime storage remains a string.
	return value as ReadModelKey<Snapshot>;
}

export function pageBaseKey(slug: string) {
	return readModelKey<PageBaseSnapshot>(
		`tipitaka/v2/pages/${encodeURIComponent(slug)}/base`,
	);
}

export function pageAnnotationsKey(slug: string) {
	return readModelKey<PageAnnotationsSnapshot>(
		`tipitaka/v2/pages/${encodeURIComponent(slug)}/annotations`,
	);
}

export function pageTranslationPointerKey(pageId: number, locale: string) {
	return readModelKey<TranslationPointer>(
		`tipitaka/v2/translations/${encodeURIComponent(locale)}/${pageId}/current`,
	);
}

export function pageTranslationKey(
	pageId: number,
	locale: string,
	revision: string,
) {
	return readModelKey<TranslationOverlay>(
		`tipitaka/v2/translations/${encodeURIComponent(locale)}/${pageId}/${revision}`,
	);
}

export function homeBaseKey() {
	return readModelKey<HomeBaseSnapshot>("tipitaka/v2/home/base");
}
export function pageStateKey(pageId: number) {
	return readModelKey<PageStateSnapshot>(`tipitaka/v2/pages/${pageId}/state`);
}

export function homeTranslationPointerKey(locale: string) {
	return readModelKey<TranslationPointer>(
		`tipitaka/v2/home/translations/${encodeURIComponent(locale)}/current`,
	);
}

export function homeTranslationKey(locale: string, revision: string) {
	return readModelKey<TranslationOverlay>(
		`tipitaka/v2/home/translations/${encodeURIComponent(locale)}/${revision}`,
	);
}
