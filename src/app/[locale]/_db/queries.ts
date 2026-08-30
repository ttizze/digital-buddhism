import { serverLogger } from "@/app/_service/logger.server";
import type { PageDetail, SegmentForPage } from "@/app/[locale]/types";
import { db } from "@/db";
import type { SegmentTypeKey } from "@/drizzle/types";
import { TIPITAKA_ROOT_SLUG } from "../_domain/tipitaka-page-visibility";
import { bestTranslationTextSubquery } from "./best-translation-subquery.server";

type SegmentWithAnnotations = SegmentForPage & {
	annotations: Array<{ annotationSegment: SegmentForPage }>;
};

async function fetchPageBasicBySlug(slug: string) {
	return db
		.selectFrom("tipitakaPages")
		.selectAll()
		.where("slug", "=", slug)
		.executeTakeFirst();
}

async function isTipitakaPageHierarchyVisible(
	pageId: number,
): Promise<boolean> {
	const ancestors = await db
		.withRecursive("ancestors", (qb) =>
			qb
				.selectFrom("tipitakaPages")
				.select(["id", "slug", "kind", "parentId", "isVisible"])
				.where("id", "=", pageId)
				.unionAll(
					qb
						.selectFrom("tipitakaPages")
						.innerJoin("ancestors", "tipitakaPages.id", "ancestors.parentId")
						.select([
							"tipitakaPages.id",
							"tipitakaPages.slug",
							"tipitakaPages.kind",
							"tipitakaPages.parentId",
							"tipitakaPages.isVisible",
						]),
				),
		)
		.selectFrom("ancestors")
		.selectAll()
		.execute();
	return (
		ancestors.some(
			(ancestor) =>
				ancestor.kind === "ROOT" &&
				ancestor.slug === TIPITAKA_ROOT_SLUG &&
				ancestor.parentId === null,
		) && ancestors.every((ancestor) => ancestor.isVisible)
	);
}

async function fetchSegments(
	pageId: number,
	locale: string,
	segmentTypeKey?: SegmentTypeKey,
): Promise<SegmentForPage[]> {
	let query = db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.select([
			"segments.id",
			"segments.tipitakaPageId as pageId",
			"segments.number",
			"segments.text",
			"segmentTypes.key as segmentTypeKey",
			"segmentTypes.label as segmentTypeLabel",
		])
		.select((eb) =>
			bestTranslationTextSubquery({
				locale,
				segmentId: eb.ref("segments.id"),
			}).as("translationText"),
		)
		.where("segments.tipitakaPageId", "=", pageId);
	if (segmentTypeKey) {
		query = query.where("segmentTypes.key", "=", segmentTypeKey);
	}
	return query.orderBy("segments.number", "asc").execute();
}

async function fetchSegmentsByIds(
	segmentIds: number[],
	locale: string,
): Promise<SegmentForPage[]> {
	if (segmentIds.length === 0) return [];
	return db
		.selectFrom("segments")
		.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
		.select([
			"segments.id",
			"segments.tipitakaPageId as pageId",
			"segments.number",
			"segments.text",
			"segmentTypes.key as segmentTypeKey",
			"segmentTypes.label as segmentTypeLabel",
		])
		.select((eb) =>
			bestTranslationTextSubquery({
				locale,
				segmentId: eb.ref("segments.id"),
			}).as("translationText"),
		)
		.where("segments.id", "in", segmentIds)
		.execute();
}

async function addAnnotations(
	pageSegments: SegmentForPage[],
	pageId: number,
	locale: string,
): Promise<SegmentWithAnnotations[]> {
	const segmentIds = pageSegments.map((segment) => segment.id);
	if (segmentIds.length === 0) {
		return pageSegments.map((segment) => ({ ...segment, annotations: [] }));
	}

	const links = await db
		.selectFrom("segmentAnnotationLinks")
		.select(["mainSegmentId", "annotationSegmentId"])
		.where("mainSegmentId", "in", segmentIds)
		.execute();
	const annotationSegmentIds = [
		...new Set(links.map((link) => link.annotationSegmentId)),
	];
	if (annotationSegmentIds.length === 0) {
		return pageSegments.map((segment) => ({ ...segment, annotations: [] }));
	}

	const annotationSegments = await fetchSegmentsByIds(
		annotationSegmentIds,
		locale,
	);
	const annotationById = new Map(
		annotationSegments.map((segment) => [segment.id, segment]),
	);
	const annotationIdsByMainSegmentId = new Map<number, number[]>();
	for (const link of links) {
		const annotationIds =
			annotationIdsByMainSegmentId.get(link.mainSegmentId) ?? [];
		annotationIds.push(link.annotationSegmentId);
		annotationIdsByMainSegmentId.set(link.mainSegmentId, annotationIds);
	}

	return pageSegments.map((segment) => ({
		...segment,
		annotations: (annotationIdsByMainSegmentId.get(segment.id) ?? []).flatMap(
			(annotationSegmentId) => {
				const annotationSegment = annotationById.get(annotationSegmentId);
				if (annotationSegment) return [{ annotationSegment }];
				serverLogger.warn(
					{ annotationSegmentId, mainSegmentId: segment.id, pageId },
					"Annotation segment not found, skipping",
				);
				return [];
			},
		),
	}));
}

export async function queryPageDetail(
	slug: string,
	locale: string,
): Promise<PageDetail | null> {
	const page = await fetchPageBasicBySlug(slug);
	if (!page?.isVisible || !(await isTipitakaPageHierarchyVisible(page.id))) {
		return null;
	}
	const pageSegments = await fetchSegments(page.id, locale, "PRIMARY");
	const segmentsWithAnnotations = await addAnnotations(
		pageSegments,
		page.id,
		locale,
	);
	const titleSegment = segmentsWithAnnotations.find(
		(segment) => segment.number === 0,
	);
	const title = titleSegment
		? titleSegment.translationText
			? `${titleSegment.text} - ${titleSegment.translationText}`
			: titleSegment.text
		: "";
	return {
		id: page.id,
		slug: page.slug,
		title,
		kind: page.kind,
		parentId: page.parentId,
		position: page.position,
		mdastJson: page.mdastJson,
		segments: segmentsWithAnnotations,
		createdAt: page.createdAt,
		updatedAt: page.updatedAt,
	};
}
