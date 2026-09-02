import * as v from "valibot";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import {
	positiveIntegerFromString,
	voteValueFromString,
} from "@/app/api/_utils/request-schemas";
import { withAuthedFormData } from "@/app/api/_utils/with-authed-form-data";
import { privateJsonResponse } from "@/app/api/_utils/with-authed-request";
import { db } from "@/db";
import { deleteOwnTranslation } from "./_db/mutations.server";
import {
	createNotificationPageSegmentTranslationVote,
	handleVote,
} from "./_db/vote-mutations.server";
import { parseSegmentTranslations } from "./_domain/segment-translations";
import { addTranslationService } from "./_service/add-translation.server";

const getSchema = v.object({
	segmentId: positiveIntegerFromString,
	userLocale: v.pipe(v.string(), v.minLength(1)),
});

const postSchema = v.object({
	locale: v.pipe(v.string(), v.minLength(1)),
	segmentId: positiveIntegerFromString,
	text: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "Translation cannot be empty"),
		v.maxLength(30000, "Translation is too long"),
	),
});

const patchSchema = v.object({
	segmentTranslationId: positiveIntegerFromString,
	isUpvote: voteValueFromString,
});

const deleteSchema = v.object({
	translationId: positiveIntegerFromString,
});

async function listSegmentTranslations(
	segmentId: number,
	userLocale: string,
	currentUserId: string | null,
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

	return parseSegmentTranslations(
		translations.map(({ selectedTranslationId, ...translation }) => ({
			...translation,
			isSelected: selectedTranslationId !== null,
		})),
	);
}

export async function getSegmentTranslations(
	request: Request,
): Promise<Response> {
	const validation = v.safeParse(
		getSchema,
		Object.fromEntries(new URL(request.url).searchParams),
	);

	if (!validation.success) {
		return privateJsonResponse(
			{ message: "Invalid parameters" },
			{ status: 400 },
		);
	}

	const { segmentId, userLocale } = validation.output;
	const currentUser = await getCurrentUserFromHeaders(request.headers);

	try {
		const response = await listSegmentTranslations(
			segmentId,
			userLocale,
			currentUser?.id ?? null,
		);
		return privateJsonResponse(response, {});
	} catch (error) {
		console.error("Error fetching translations:", error);
		return privateJsonResponse(
			{ message: "Failed to fetch translations" },
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
			return Response.json({ message: result.message }, { status: 400 });
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
				currentUser.id,
				data.translationId,
			);
			if (!deleted) {
				return Response.json(
					{ message: "Translation not found or unauthorized" },
					{ status: 404 },
				);
			}

			return Response.json({ success: true });
		},
	);
}
