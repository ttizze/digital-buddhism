import * as v from "valibot";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import {
	positiveIntegerFromString,
	voteValueFromString,
} from "@/app/api/_utils/request-schemas";
import { withAuthedFormData } from "@/app/api/_utils/with-authed-form-data";
import { privateJsonResponse } from "@/app/api/_utils/with-authed-request";
import { db } from "@/db";
import { handleGlossUnitVote } from "./_db/mutation.server";
import { parseSegmentGlossVotes } from "./_domain/segment-glosses";

const getSchema = v.object({
	pageId: positiveIntegerFromString,
	locale: v.pipe(v.string(), v.minLength(1)),
});

const patchSchema = v.object({
	glossUnitId: positiveIntegerFromString,
	isUpvote: voteValueFromString,
});

export async function getSegmentGlosses(request: Request): Promise<Response> {
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

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	if (!currentUser)
		return privateJsonResponse({ message: "Unauthorized" }, { status: 401 });
	const { pageId, locale } = validation.output;

	try {
		const glossUnits = await db
			.selectFrom("selectedSegmentGlossSets as selected")
			.innerJoin(
				"segmentGlossUnits as unit",
				"unit.glossSetId",
				"selected.glossSetId",
			)
			.innerJoin("segments as segment", "segment.id", "selected.segmentId")
			.leftJoin("segmentGlossUnitVotes as vote", (join) =>
				join
					.onRef("vote.glossUnitId", "=", "unit.id")
					.on("vote.userId", "=", currentUser.id),
			)
			.select([
				"unit.id",
				"unit.point",
				"vote.isUpvote as currentUserVoteIsUpvote",
			])
			.where("segment.tipitakaPageId", "=", pageId)
			.where("selected.locale", "=", locale)
			.orderBy("selected.segmentId")
			.orderBy("unit.position")
			.execute();

		return privateJsonResponse(parseSegmentGlossVotes(glossUnits), {});
	} catch (error) {
		console.error("Error fetching segment glosses:", error);
		return privateJsonResponse(
			{ message: "Failed to fetch segment glosses" },
			{ status: 500 },
		);
	}
}

export async function patchSegmentGlossVote(
	request: Request,
): Promise<Response> {
	return withAuthedFormData(request, patchSchema, async (data, currentUser) => {
		const glossUnit = await handleGlossUnitVote(
			data.glossUnitId,
			data.isUpvote,
			currentUser.id,
		);
		if (!glossUnit) {
			return Response.json(
				{ message: "Gloss unit not found" },
				{ status: 404 },
			);
		}

		return Response.json({ success: true, data: { glossUnit } });
	});
}
