import type { PageDetail, SegmentForPage } from "@/app/[locale]/types";
import { db } from "@/db";
import { TIPITAKA_ROOT_SLUG } from "../_domain/tipitaka-page-visibility";
import { bestTranslationTextSubquery } from "./best-translation-subquery.server";

type SegmentWithAnnotations = SegmentForPage & {
	annotations: Array<{ annotationSegment: SegmentForPage }>;
};

async function fetchVisiblePageBySlug(slug: string) {
	return db
		.withRecursive("ancestors", (qb) =>
			qb
				.selectFrom("tipitakaPages")
				.select(["id", "slug", "parentId"])
				.where("slug", "=", slug)
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
		.selectFrom("tipitakaPages as page")
		.selectAll("page")
		.where("page.slug", "=", slug)
		.where(({ exists, selectFrom }) =>
			exists(
				selectFrom("ancestors")
					.select("ancestors.id")
					.where("ancestors.slug", "=", TIPITAKA_ROOT_SLUG)
					.where("ancestors.parentId", "is", null),
			),
		)
		.executeTakeFirst();
}

async function fetchSegmentsWithAnnotations(
	pageId: number,
	locale: string,
): Promise<SegmentWithAnnotations[]> {
	const rows = await db
		.selectFrom("segments as pageSegment")
		.innerJoin("tipitakaPages as page", "pageSegment.tipitakaPageId", "page.id")
		.leftJoin(
			"segmentAnnotationLinks as annotationLink",
			"annotationLink.targetSegmentId",
			"pageSegment.id",
		)
		.leftJoin(
			"segments as annotationSegment",
			"annotationSegment.id",
			"annotationLink.annotationSegmentId",
		)
		.leftJoin(
			"tipitakaPages as annotationPage",
			"annotationSegment.tipitakaPageId",
			"annotationPage.id",
		)
		.select((eb) => [
			"pageSegment.id as segmentId",
			"pageSegment.tipitakaPageId as segmentPageId",
			"pageSegment.number as segmentNumber",
			"pageSegment.text as segmentText",
			"page.textLevel as segmentTextLevel",
			bestTranslationTextSubquery({
				locale,
				segmentId: eb.ref("pageSegment.id"),
			}).as("segmentTranslationText"),
			"annotationLink.annotationSegmentId as linkedAnnotationSegmentId",
			"annotationSegment.id as annotationSegmentId",
			"annotationSegment.tipitakaPageId as annotationPageId",
			"annotationSegment.number as annotationNumber",
			"annotationSegment.text as annotationText",
			"annotationPage.textLevel as annotationTextLevel",
			bestTranslationTextSubquery({
				locale,
				segmentId: eb.ref("annotationSegment.id").$castTo<number>(),
			}).as("annotationTranslationText"),
		])
		.where("pageSegment.tipitakaPageId", "=", pageId)
		.orderBy("pageSegment.number", "asc")
		.orderBy("annotationSegment.id", "asc")
		.execute();

	const segmentsById = new Map<number, SegmentWithAnnotations>();
	for (const row of rows) {
		let segment = segmentsById.get(row.segmentId);
		if (!segment) {
			segment = {
				id: row.segmentId,
				pageId: row.segmentPageId,
				number: row.segmentNumber,
				text: row.segmentText,
				translationText: row.segmentTranslationText,
				textLevel: row.segmentTextLevel,
				annotations: [],
			};
			segmentsById.set(segment.id, segment);
		}

		if (row.linkedAnnotationSegmentId === null) continue;
		if (
			row.annotationSegmentId === null ||
			row.annotationPageId === null ||
			row.annotationNumber === null ||
			row.annotationText === null
		) {
			console.warn("Annotation segment not found, skipping", {
				annotationSegmentId: row.linkedAnnotationSegmentId,
				targetSegmentId: row.segmentId,
				pageId,
			});
			continue;
		}

		segment.annotations.push({
			annotationSegment: {
				id: row.annotationSegmentId,
				pageId: row.annotationPageId,
				number: row.annotationNumber,
				text: row.annotationText,
				translationText: row.annotationTranslationText,
				textLevel: row.annotationTextLevel,
			},
		});
	}

	return [...segmentsById.values()];
}

export async function queryPageDetail(
	slug: string,
	locale: string,
): Promise<PageDetail | null> {
	const page = await fetchVisiblePageBySlug(slug);
	if (!page) return null;

	const segments = await fetchSegmentsWithAnnotations(page.id, locale);
	const titleSegment = segments.find((segment) => segment.number === 0);
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
		segments,
		createdAt: page.createdAt,
		updatedAt: page.updatedAt,
	};
}
