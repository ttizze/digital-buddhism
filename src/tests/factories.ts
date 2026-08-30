import { randomUUID } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import type { Root as MdastRoot } from "mdast";
import { TIPITAKA_ROOT_SLUG } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { db } from "@/db";
import type {
	JsonValue,
	SegmentTypeKey,
	TipitakaPageKind,
} from "@/drizzle/types";
import { getSegmentTypeId } from "./db-helpers";

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
	kind?: TipitakaPageKind;
	mdastJson?: unknown;
	parentId?: number | null;
	position?: number;
	isVisible?: boolean;
}) {
	const kind = data.kind ?? "TEXT";
	let parentId = data.parentId ?? null;
	if (kind !== "ROOT" && parentId === null) {
		const root =
			(await db
				.selectFrom("tipitakaPages")
				.select("id")
				.where("kind", "=", "ROOT")
				.executeTakeFirst()) ??
			(await db
				.insertInto("tipitakaPages")
				.values({
					slug: TIPITAKA_ROOT_SLUG,
					kind: "ROOT",
					mdastJson: {} as JsonValue,
					position: 0,
					isVisible: true,
					parentId: null,
				})
				.returning("id")
				.executeTakeFirstOrThrow());
		parentId = root.id;
	}

	return db
		.insertInto("tipitakaPages")
		.values({
			slug: data.slug,
			kind,
			mdastJson: (data.mdastJson ?? {}) as JsonValue,
			parentId,
			position: data.position ?? 0,
			isVisible: data.isVisible ?? true,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function createSegment(data: {
	pageId: number;
	number: number;
	text: string;
	textAndOccurrenceHash: string;
	segmentTypeKey?: SegmentTypeKey;
}) {
	const segmentTypeId = await getSegmentTypeId(
		data.segmentTypeKey ?? "PRIMARY",
	);
	return db
		.insertInto("segments")
		.values({
			tipitakaPageId: data.pageId,
			number: data.number,
			text: data.text,
			textAndOccurrenceHash: data.textAndOccurrenceHash,
			segmentTypeId,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function createSegments(data: {
	pageId: number;
	segments: Array<{
		number: number;
		text: string;
		textAndOccurrenceHash: string;
		segmentTypeKey?: SegmentTypeKey;
	}>;
}) {
	if (data.segments.length === 0) return;
	const primarySegmentTypeId = await getSegmentTypeId("PRIMARY");
	const commentarySegmentTypeId = await getSegmentTypeId("COMMENTARY");
	const segmentTypeIdByKey: Record<SegmentTypeKey, number> = {
		PRIMARY: primarySegmentTypeId,
		COMMENTARY: commentarySegmentTypeId,
	};
	await db
		.insertInto("segments")
		.values(
			data.segments.map((segment) => ({
				tipitakaPageId: data.pageId,
				number: segment.number,
				text: segment.text,
				textAndOccurrenceHash: segment.textAndOccurrenceHash,
				segmentTypeId: segmentTypeIdByKey[segment.segmentTypeKey ?? "PRIMARY"],
			})),
		)
		.execute();
}

export async function createPageWithSegments(data: {
	slug: string;
	kind?: TipitakaPageKind;
	mdastJson?: MdastRoot;
	parentId?: number | null;
	position?: number;
	isVisible?: boolean;
	segments: Array<{
		number: number;
		text: string;
		textAndOccurrenceHash: string;
		segmentTypeKey?: SegmentTypeKey;
	}>;
}) {
	const page = await createPage({
		slug: data.slug,
		kind: data.kind,
		mdastJson: data.mdastJson,
		parentId: data.parentId,
		position: data.position,
		isVisible: data.isVisible,
	});
	await createSegments({ pageId: page.id, segments: data.segments });
	return page;
}

export async function createSegmentAnnotationLink(data: {
	mainSegmentId: number;
	annotationSegmentId: number;
}) {
	return db
		.insertInto("segmentAnnotationLinks")
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function createPageWithAnnotations(data: {
	mainPageSlug: string;
	mainPageSegments: Array<{
		number: number;
		text: string;
		textAndOccurrenceHash: string;
	}>;
	annotationSegments: Array<{
		number: number;
		text: string;
		textAndOccurrenceHash: string;
		linkedToMainSegmentNumber: number;
	}>;
}) {
	const mainPage = await createPageWithSegments({
		slug: data.mainPageSlug,
		kind: "TEXT",
		segments: data.mainPageSegments.map((segment) => ({
			...segment,
			segmentTypeKey: "PRIMARY",
		})),
	});
	const annotationPage = await createPage({
		slug: `${data.mainPageSlug}-annotation`,
		kind: "COMMENTARY",
		parentId: mainPage.parentId,
	});
	await createSegments({
		pageId: annotationPage.id,
		segments: data.annotationSegments.map((segment) => ({
			...segment,
			segmentTypeKey: "COMMENTARY",
		})),
	});

	for (const annotationSegment of data.annotationSegments) {
		const [mainSegment, annotation] = await Promise.all([
			db
				.selectFrom("segments")
				.selectAll()
				.where("tipitakaPageId", "=", mainPage.id)
				.where("number", "=", annotationSegment.linkedToMainSegmentNumber)
				.executeTakeFirst(),
			db
				.selectFrom("segments")
				.selectAll()
				.where("tipitakaPageId", "=", annotationPage.id)
				.where("number", "=", annotationSegment.number)
				.executeTakeFirst(),
		]);
		if (mainSegment && annotation) {
			await createSegmentAnnotationLink({
				mainSegmentId: mainSegment.id,
				annotationSegmentId: annotation.id,
			});
		}
	}
	return { mainPage, annotationPage };
}

export async function createGeminiApiKey(data: {
	userId: string;
	apiKey?: string;
}) {
	return db
		.insertInto("geminiApiKeys")
		.values({
			userId: data.userId,
			apiKey: data.apiKey ?? "dummy-api-key",
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function createSession(data: {
	userId: string;
	token?: string;
	expiresAt?: Date;
}) {
	const token = data.token ?? `session_${randomUUID().replaceAll("-", "")}`;
	return db
		.insertInto("sessions")
		.values({
			id: createId(),
			token,
			userId: data.userId,
			expiresAt: data.expiresAt ?? new Date(Date.now() + 86_400_000),
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}
