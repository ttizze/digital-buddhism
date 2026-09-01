import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { addTranslationService } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-section/add-translation-form/service/add-translation.server";
import {
	createNotificationPageSegmentTranslationVote,
	handleVote,
} from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-section/vote-buttons/db/mutation.server";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { withAuthedFormData } from "@/app/api/_utils/with-authed-form-data";
import { db } from "@/db";
import { deleteOwnTranslation } from "./_db/mutations.server";
import { segmentTranslationSchema } from "./_domain/segment-translations";

const getSchema = z.object({
	segmentId: z.coerce.number().int().positive(),
	userLocale: z.string().min(1),
});

const postSchema = z.object({
	locale: z.string().min(1),
	segmentId: z.coerce.number().int().positive(),
	text: z
		.string()
		.min(1, "Translation cannot be empty")
		.max(30000, "Translation is too long")
		.transform((val) => val.trim()),
});

const patchSchema = z.object({
	segmentTranslationId: z.coerce.number().int().positive(),
	isUpvote: z.enum(["true", "false"]).transform((value) => value === "true"),
});

const deleteSchema = z.object({
	translationId: z.coerce.number().int().positive(),
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
		return Response.json(response, { headers: PRIVATE_RESPONSE_HEADERS });
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
	return withAuthedFormData(request, postSchema, async (data, currentUser) => {
		const result = await addTranslationService(
			data.segmentId,
			data.text,
			currentUser.id,
			data.locale,
		);

		if (!result.success) {
			return Response.json({ error: result.message }, { status: 400 });
		}

		return Response.json({ success: true });
	});
}

export async function patchSegmentTranslationVote(
	request: Request,
): Promise<Response> {
	return withAuthedFormData(request, patchSchema, async (data, currentUser) => {
		const vote = await handleVote(
			data.segmentTranslationId,
			data.isUpvote,
			currentUser.id,
		);

		if (vote.isUpvote) {
			await createNotificationPageSegmentTranslationVote(
				data.segmentTranslationId,
				currentUser.id,
			);
		}

		const translations = await listSegmentTranslations(
			vote.segmentId,
			vote.locale,
			currentUser.id,
		);
		return Response.json({ success: true, data: { translations } });
	});
}

export async function deleteSegmentTranslation(
	request: Request,
): Promise<Response> {
	return withAuthedFormData(
		request,
		deleteSchema,
		async (data, currentUser) => {
			const deleted = await deleteOwnTranslation(
				currentUser.handle,
				data.translationId,
			);
			if (!deleted) {
				return Response.json(
					{ error: "Translation not found or unauthorized" },
					{ status: 404 },
				);
			}

			return Response.json({ success: true });
		},
	);
}
