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

export type SegmentTranslation = v.InferOutput<typeof segmentTranslationSchema>;

export function parseSegmentTranslations(input: unknown): SegmentTranslation[] {
	return v.parse(segmentTranslationsSchema, input);
}
