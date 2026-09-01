import * as v from "valibot";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { withAuthedFormData } from "@/app/api/_utils/with-authed-form-data";
import { db } from "@/db";
import { handleGlossUnitVote } from "./_db/mutation.server";
import { parseSegmentGlossUnits } from "./_domain/segment-glosses";

const positiveIntegerFromString = v.pipe(
	v.string(),
	v.toNumber(),
	v.integer(),
	v.minValue(1),
);

const getSchema = v.object({
	pageId: positiveIntegerFromString,
	locale: v.pipe(v.string(), v.minLength(1)),
});

const patchSchema = v.object({
	glossUnitId: positiveIntegerFromString,
	isUpvote: v.pipe(
		v.picklist(["true", "false"]),
		v.transform((value) => value === "true"),
	),
});

export async function getSegmentGlosses(request: Request): Promise<Response> {
	const validation = v.safeParse(
		getSchema,
		Object.fromEntries(new URL(request.url).searchParams),
	);
	if (!validation.success) {
		return Response.json({ error: "Invalid parameters" }, { status: 400 });
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	const { pageId, locale } = validation.output;

	try {
		const glossUnits = await db
			.selectFrom("selectedSegmentGlossSets as selected")
			.innerJoin("segmentGlossSets as glossSet", (join) =>
				join
					.onRef("glossSet.id", "=", "selected.glossSetId")
					.onRef("glossSet.segmentId", "=", "selected.segmentId")
					.onRef("glossSet.locale", "=", "selected.locale"),
			)
			.innerJoin("segmentGlossUnits as unit", "unit.glossSetId", "glossSet.id")
			.innerJoin("segments as segment", "segment.id", "selected.segmentId")
			.leftJoin("segmentGlossUnitVotes as vote", (join) =>
				join
					.onRef("vote.glossUnitId", "=", "unit.id")
					.on("vote.userId", "=", currentUser?.id ?? ""),
			)
			.select([
				"unit.id",
				"selected.segmentId",
				"unit.position",
				"unit.startOffset",
				"unit.endOffset",
				"unit.surface",
				"unit.gloss",
				"unit.point",
				"vote.isUpvote as currentUserVoteIsUpvote",
			])
			.where("segment.tipitakaPageId", "=", pageId)
			.where("selected.locale", "=", locale)
			.orderBy("selected.segmentId")
			.orderBy("unit.position")
			.execute();

		return Response.json(parseSegmentGlossUnits(glossUnits), {
			headers: PRIVATE_RESPONSE_HEADERS,
		});
	} catch (error) {
		console.error("Error fetching segment glosses:", error);
		return Response.json(
			{ error: "Failed to fetch segment glosses" },
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
			return Response.json({ error: "Gloss unit not found" }, { status: 404 });
		}

		return Response.json({ success: true, data: { glossUnit } });
	});
}
