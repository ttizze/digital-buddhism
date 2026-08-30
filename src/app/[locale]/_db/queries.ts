import { serverLogger } from "@/app/_service/logger.server";
import type { PageDetail, SegmentForPage } from "@/app/[locale]/types";
import { db } from "@/db";
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

async function isTipitakaPageInHierarchy(pageId: number): Promise<boolean> {
	const ancestors = await db
		.withRecursive("ancestors", (qb) =>
			qb
				.selectFrom("tipitakaPages")
				.select(["id", "slug", "parentId"])
				.where("id", "=", pageId)
				.unionAll(
					qb
						.selectFrom("tipitakaPages")
						.innerJoin("ancestors", "tipitakaPages.id", "ancestors.parentId")
						.select([
							"tipitakaPages.id",
							"tipitakaPages.slug",
							"tipitakaPages.parentId",
						]),
				),
		)
		.selectFrom("ancestors")
		.selectAll()
		.execute();
	return ancestors.some(
		(ancestor) =>
			ancestor.slug === TIPITAKA_ROOT_SLUG && ancestor.parentId === null,
	);
}

async function fetchSegments(
	pageId: number,
	locale: string,
): Promise<SegmentForPage[]> {
	return db
		.selectFrom("segments")
		.innerJoin("tipitakaPages", "segments.tipitakaPageId", "tipitakaPages.id")
		.select([
			"segments.id",
			"segments.tipitakaPageId as pageId",
			"segments.number",
			"segments.text",
			"tipitakaPages.textLevel",
		])
		.select((eb) =>
			bestTranslationTextSubquery({
				locale,
				segmentId: eb.ref("segments.id"),
			}).as("translationText"),
		)
		.where("segments.tipitakaPageId", "=", pageId)
		.orderBy("segments.number", "asc")
		.execute();
}

async function fetchSegmentsByIds(
	segmentIds: number[],
	locale: string,
): Promise<SegmentForPage[]> {
	if (segmentIds.length === 0) return [];
	return db
		.selectFrom("segments")
		.innerJoin("tipitakaPages", "segments.tipitakaPageId", "tipitakaPages.id")
		.select([
			"segments.id",
			"segments.tipitakaPageId as pageId",
			"segments.number",
			"segments.text",
			"tipitakaPages.textLevel",
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
		.select(["targetSegmentId", "annotationSegmentId"])
		.where("targetSegmentId", "in", segmentIds)
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
	const annotationIdsByTargetSegmentId = new Map<number, number[]>();
	for (const link of links) {
		const annotationIds =
			annotationIdsByTargetSegmentId.get(link.targetSegmentId) ?? [];
		annotationIds.push(link.annotationSegmentId);
		annotationIdsByTargetSegmentId.set(link.targetSegmentId, annotationIds);
	}

	return pageSegments.map((segment) => ({
		...segment,
		annotations: (annotationIdsByTargetSegmentId.get(segment.id) ?? []).flatMap(
			(annotationSegmentId) => {
				const annotationSegment = annotationById.get(annotationSegmentId);
				if (annotationSegment) return [{ annotationSegment }];
				serverLogger.warn(
					{ annotationSegmentId, targetSegmentId: segment.id, pageId },
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
	if (!page || !(await isTipitakaPageInHierarchy(page.id))) return null;

	const pageSegments = await fetchSegments(page.id, locale);
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
		textLevel: page.textLevel,
		parentId: page.parentId,
		position: page.position,
		mdastJson: page.mdastJson,
		segments: segmentsWithAnnotations,
		createdAt: page.createdAt,
		updatedAt: page.updatedAt,
	};
}
