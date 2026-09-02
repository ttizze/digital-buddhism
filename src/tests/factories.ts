import { randomUUID } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import type { Root as MdastRoot } from "mdast";
import { TIPITAKA_ROOT_SLUG } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { db } from "@/db";
import type { TipitakaTextLevel } from "@/drizzle/types";

export async function createUser(data?: {
	handle?: string;
	name?: string;
	email?: string;
	image?: string;
	profile?: string;
}) {
	const uniqueId = randomUUID().slice(0, 8);
	return db
		.insertInto("users")
		.values({
			id: createId(),
			handle: data?.handle ?? `testuser-${uniqueId}`,
			name: data?.name ?? "Test User",
			email: data?.email ?? `testuser-${uniqueId}@example.com`,
			image: data?.image ?? "https://example.com/image.jpg",
			profile: data?.profile ?? "",
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function createPage(data: {
	slug: string;
	catalogKey?: string;
	textLevel?: TipitakaTextLevel | null;
	mdastJson?: MdastRoot;
	parentId?: number | null;
	position?: number;
	importFileId?: number | null;
}) {
	const isRoot = data.slug === TIPITAKA_ROOT_SLUG;
	let parentId = data.parentId ?? null;
	if (!isRoot && parentId === null) {
		const root =
			(await db
				.selectFrom("tipitakaPages")
				.select("id")
				.where("parentId", "is", null)
				.executeTakeFirst()) ??
			(await db
				.insertInto("tipitakaPages")
				.values({
					catalogKey: TIPITAKA_ROOT_SLUG,
					slug: TIPITAKA_ROOT_SLUG,
					textLevel: null,
					mdastJson: { type: "root", children: [] },
					position: 0,
					parentId: null,
					importFileId: null,
				})
				.returning("id")
				.executeTakeFirstOrThrow());
		parentId = root.id;
	}

	return db
		.insertInto("tipitakaPages")
		.values({
			catalogKey: data.catalogKey ?? data.slug,
			slug: data.slug,
			textLevel:
				data.textLevel === undefined
					? isRoot
						? null
						: "MULA"
					: data.textLevel,
			mdastJson: data.mdastJson ?? { type: "root", children: [] },
			parentId,
			position: data.position ?? 0,
			importFileId: data.importFileId ?? null,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export interface TestSegmentInput {
	number: number;
	text: string;
	textAndOccurrenceHash: string;
	sourceBookCode?: string | null;
	sourceChapterNumber?: number | null;
	sourceParagraphNumber?: string | null;
	sourceParagraphOccurrence?: number | null;
}

export async function createSegment(
	data: TestSegmentInput & { pageId: number },
) {
	return db
		.insertInto("segments")
		.values({
			tipitakaPageId: data.pageId,
			number: data.number,
			text: data.text,
			textAndOccurrenceHash: data.textAndOccurrenceHash,
			sourceBookCode: data.sourceBookCode ?? null,
			sourceChapterNumber: data.sourceChapterNumber ?? null,
			sourceParagraphNumber: data.sourceParagraphNumber ?? null,
			sourceParagraphOccurrence: data.sourceParagraphOccurrence ?? null,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function createSegments(data: {
	pageId: number;
	segments: TestSegmentInput[];
}) {
	if (data.segments.length === 0) return;
	await db
		.insertInto("segments")
		.values(
			data.segments.map((segment) => ({
				tipitakaPageId: data.pageId,
				number: segment.number,
				text: segment.text,
				textAndOccurrenceHash: segment.textAndOccurrenceHash,
				sourceBookCode: segment.sourceBookCode ?? null,
				sourceChapterNumber: segment.sourceChapterNumber ?? null,
				sourceParagraphNumber: segment.sourceParagraphNumber ?? null,
				sourceParagraphOccurrence: segment.sourceParagraphOccurrence ?? null,
			})),
		)
		.execute();
}

export async function createPageWithSegments(data: {
	slug: string;
	catalogKey?: string;
	textLevel?: TipitakaTextLevel | null;
	mdastJson?: MdastRoot;
	parentId?: number | null;
	position?: number;
	segments: TestSegmentInput[];
}) {
	const page = await createPage({
		slug: data.slug,
		catalogKey: data.catalogKey,
		textLevel: data.textLevel,
		mdastJson: data.mdastJson,
		parentId: data.parentId,
		position: data.position,
	});
	await createSegments({ pageId: page.id, segments: data.segments });
	return page;
}

export async function createSegmentAnnotationLink(data: {
	targetSegmentId: number;
	annotationSegmentId: number;
}) {
	return db
		.insertInto("segmentAnnotationLinks")
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function createPageWithAnnotations(data: {
	targetPageSlug: string;
	targetPageSegments: TestSegmentInput[];
	annotationSegments: Array<
		TestSegmentInput & { linkedToTargetSegmentNumber: number }
	>;
}) {
	const targetPage = await createPageWithSegments({
		slug: data.targetPageSlug,
		textLevel: "MULA",
		segments: data.targetPageSegments,
	});
	const annotationPage = await createPage({
		slug: `${data.targetPageSlug}-annotation`,
		textLevel: "ATTHAKATHA",
		parentId: targetPage.parentId,
	});
	await createSegments({
		pageId: annotationPage.id,
		segments: data.annotationSegments,
	});
	await db
		.insertInto("tipitakaPageAnnotationTargets")
		.values({
			annotationPageId: annotationPage.id,
			targetPageId: targetPage.id,
			position: 0,
		})
		.execute();

	for (const annotationSegment of data.annotationSegments) {
		const [targetSegment, annotation] = await Promise.all([
			db
				.selectFrom("segments")
				.selectAll()
				.where("tipitakaPageId", "=", targetPage.id)
				.where("number", "=", annotationSegment.linkedToTargetSegmentNumber)
				.executeTakeFirst(),
			db
				.selectFrom("segments")
				.selectAll()
				.where("tipitakaPageId", "=", annotationPage.id)
				.where("number", "=", annotationSegment.number)
				.executeTakeFirst(),
		]);
		if (targetSegment && annotation) {
			await createSegmentAnnotationLink({
				targetSegmentId: targetSegment.id,
				annotationSegmentId: annotation.id,
			});
		}
	}
	return { targetPage, annotationPage };
}
