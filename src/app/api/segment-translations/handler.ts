import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { parseFormData } from "@/app/[locale]/_utils/parse-form-data";
import { addTranslationService } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-section/add-translation-form/service/add-translation.server";
import {
	createNotificationPageSegmentTranslationVote,
	handleVote,
} from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-section/vote-buttons/db/mutation.server";
import { isSameOriginRequest } from "@/app/api/_utils/is-same-origin-request";
import { db } from "@/db";
import { deleteOwnTranslation } from "./_db/mutations.server";
import { segmentTranslationSchema } from "./_domain/segment-translations";

const getSchema = z.object({
	segmentId: z.coerce.number().int(),
	userLocale: z.string(),
});

const postSchema = z.object({
	locale: z.string(),
	segmentId: z.coerce.number(),
	text: z
		.string()
		.min(1, "Translation cannot be empty")
		.max(30000, "Translation is too long")
		.transform((val) => val.trim()),
});

const patchSchema = z.object({
	segmentTranslationId: z.coerce.number().int(),
	isUpvote: z.string().transform((val) => val === "true"),
});

const deleteSchema = z.object({
	translationId: z.coerce.number(),
});

async function listSegmentTranslations(
	segmentId: number,
	userLocale: string,
	currentUserId?: string,
) {
	const translations = await db
		.selectFrom("segmentTranslations as st")
		.innerJoin("segments as s", "st.segmentId", "s.id")
		.innerJoin("users as u", "st.userId", "u.id")
		.leftJoin("translationVotes as tv", (join) =>
			join
				.onRef("tv.translationId", "=", "st.id")
				.on("tv.userId", "=", currentUserId ?? ""),
		)
		.leftJoin("selectedSegmentTranslations as selected", (join) =>
			join
				.onRef("selected.translationId", "=", "st.id")
				.onRef("selected.segmentId", "=", "st.segmentId")
				.onRef("selected.locale", "=", "st.locale"),
		)
		.select([
			"st.id",
			"st.segmentId",
			"st.locale",
			"st.text",
			"st.point",
			"st.createdAt",
			"u.name as userName",
			"u.handle as userHandle",
			"tv.isUpvote as currentUserVoteIsUpvote",
			"selected.translationId as selectedTranslationId",
		])
		.where("st.segmentId", "=", segmentId)
		.where("st.locale", "=", userLocale)
		.orderBy("selected.translationId", (ob) => ob.desc().nullsLast())
		.orderBy("st.point", "desc")
		.orderBy("st.createdAt", "desc")
		.orderBy("st.id", "desc")
		.execute();

	return segmentTranslationSchema.array().parse(
		translations.map(({ selectedTranslationId, ...translation }) => ({
			...translation,
			isSelected: selectedTranslationId !== null,
		})),
	);
}

export async function getSegmentTranslations(
	request: Request,
): Promise<Response> {
	const validation = getSchema.safeParse(
		Object.fromEntries(new URL(request.url).searchParams),
	);

	if (!validation.success) {
		return Response.json({ error: "Invalid parameters" }, { status: 400 });
	}

	const { segmentId, userLocale } = validation.data;
	const currentUser = await getCurrentUserFromHeaders(request.headers);

	try {
		const response = await listSegmentTranslations(
			segmentId,
			userLocale,
			currentUser?.id,
		);
		return Response.json(response, {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (error) {
		console.error("Error fetching translations:", error);
		return Response.json(
			{ error: "Failed to fetch translations" },
			{ status: 500 },
		);
	}
}

export async function postSegmentTranslation(
	request: Request,
): Promise<Response> {
	if (!isSameOriginRequest(request)) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	if (!currentUser) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return Response.json(
			{ success: false, message: "Invalid form data" },
			{ status: 400 },
		);
	}

	const parsed = await parseFormData(postSchema, formData);
	if (!parsed.success) {
		return Response.json(
			{
				success: false,
				zodErrors: parsed.error.flatten().fieldErrors,
			},
			{ status: 400 },
		);
	}

	const result = await addTranslationService(
		parsed.data.segmentId,
		parsed.data.text,
		currentUser.id,
		parsed.data.locale,
	);

	if (!result.success) {
		return Response.json({ success: false, message: result.message });
	}

	return Response.json({ success: true });
}

export async function patchSegmentTranslationVote(
	request: Request,
): Promise<Response> {
	if (!isSameOriginRequest(request)) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	if (!currentUser) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return Response.json(
			{ success: false, message: "Invalid form data" },
			{ status: 400 },
		);
	}

	const parsed = await parseFormData(patchSchema, formData);
	if (!parsed.success) {
		return Response.json(
			{
				success: false,
				zodErrors: parsed.error.flatten().fieldErrors,
			},
			{ status: 400 },
		);
	}

	const { segmentTranslationId, isUpvote } = parsed.data;
	const vote = await handleVote(segmentTranslationId, isUpvote, currentUser.id);

	if (vote.isUpvote) {
		await createNotificationPageSegmentTranslationVote(
			segmentTranslationId,
			currentUser.id,
		);
	}

	const translations = await listSegmentTranslations(
		vote.segmentId,
		vote.locale,
		currentUser.id,
	);
	return Response.json({ success: true, data: { translations } });
}

export async function deleteSegmentTranslation(
	request: Request,
): Promise<Response> {
	if (!isSameOriginRequest(request)) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	if (!currentUser) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return Response.json(
			{ success: false, message: "Invalid form data" },
			{ status: 400 },
		);
	}

	const parsed = await parseFormData(deleteSchema, formData);
	if (!parsed.success) {
		return Response.json(
			{
				success: false,
				zodErrors: parsed.error.flatten().fieldErrors,
			},
			{ status: 400 },
		);
	}

	const { translationId } = parsed.data;
	await deleteOwnTranslation(currentUser.handle, translationId);

	return Response.json({ success: true });
}
