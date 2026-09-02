import * as v from "valibot";

const segmentGlossUnitSchema = v.object({
	id: v.number(),
	segmentId: v.number(),
	position: v.number(),
	startOffset: v.number(),
	endOffset: v.number(),
	surface: v.string(),
	gloss: v.string(),
	point: v.number(),
	currentUserVoteIsUpvote: v.nullable(v.boolean()),
});

const segmentGlossUnitsSchema = v.array(segmentGlossUnitSchema);

const segmentGlossVoteResponseSchema = v.object({
	success: v.literal(true),
	data: v.object({
		glossUnit: v.pick(segmentGlossUnitSchema, [
			"id",
			"point",
			"currentUserVoteIsUpvote",
		]),
	}),
});

export type SegmentGlossUnit = v.InferOutput<typeof segmentGlossUnitSchema>;
export type SegmentGlossVoteResponse = v.InferOutput<
	typeof segmentGlossVoteResponseSchema
>;

export const parseSegmentGlossUnits = v.parser(segmentGlossUnitsSchema);

export const parseSegmentGlossVoteResponse = v.parser(
	segmentGlossVoteResponseSchema,
);
