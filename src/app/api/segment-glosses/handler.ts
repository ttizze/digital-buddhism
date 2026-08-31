import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { parseFormData } from "@/app/[locale]/_utils/parse-form-data";
import { isSameOriginRequest } from "@/app/api/_utils/is-same-origin-request";
import { db } from "@/db";
import { handleGlossUnitVote } from "./_db/mutation.server";
import { segmentGlossUnitSchema } from "./_domain/segment-glosses";

const getSchema = z.object({
	pageId: z.coerce.number().int().positive(),
	locale: z.string().min(1),
});

const patchSchema = z.object({
	glossUnitId: z.coerce.number().int().positive(),
	isUpvote: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function getSegmentGlosses(request: Request): Promise<Response> {
	const validation = getSchema.safeParse(
		Object.fromEntries(new URL(request.url).searchParams),
	);
	if (!validation.success) {
		return Response.json({ error: "Invalid parameters" }, { status: 400 });
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	const { pageId, locale } = validation.data;

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

		return Response.json(segmentGlossUnitSchema.array().parse(glossUnits), {
			headers: { "Cache-Control": "no-store" },
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
		return Response.json({ error: "Invalid form data" }, { status: 400 });
	}

	const parsed = await parseFormData(patchSchema, formData);
	if (!parsed.success) {
		return Response.json(
			{
				error: "Invalid form data",
				zodErrors: parsed.error.flatten().fieldErrors,
			},
			{ status: 400 },
		);
	}

	const glossUnit = await handleGlossUnitVote(
		parsed.data.glossUnitId,
		parsed.data.isUpvote,
		currentUser.id,
	);
	if (!glossUnit) {
		return Response.json({ error: "Gloss unit not found" }, { status: 404 });
	}

	return Response.json({ success: true, data: { glossUnit } });
}
