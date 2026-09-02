import * as v from "valibot";

const createdAtSchema = v.union([v.string(), v.date()]);

const segmentTranslationSchema = v.object({
	id: v.number(),
	segmentId: v.number(),
	locale: v.string(),
	text: v.string(),
	point: v.number(),
	createdAt: createdAtSchema,
	userName: v.string(),
	userHandle: v.string(),
	currentUserVoteIsUpvote: v.nullable(v.boolean()),
	isSelected: v.boolean(),
});

const segmentTranslationsSchema = v.array(segmentTranslationSchema);
const segmentTranslationVoteResponseSchema = v.object({
	success: v.literal(true),
	data: v.object({ translations: segmentTranslationsSchema }),
});

export type SegmentTranslation = v.InferOutput<typeof segmentTranslationSchema>;

export const parseSegmentTranslations = v.parser(segmentTranslationsSchema);

export const parseSegmentTranslationVoteResponse = v.parser(
	segmentTranslationVoteResponseSchema,
);
