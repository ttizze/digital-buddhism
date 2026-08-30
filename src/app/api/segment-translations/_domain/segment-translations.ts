import { z } from "zod";

const createdAtSchema = z.union([z.string(), z.date()]);

export const segmentTranslationSchema = z.object({
	id: z.number(),
	segmentId: z.number(),
	locale: z.string(),
	text: z.string(),
	point: z.number(),
	createdAt: createdAtSchema,
	userName: z.string(),
	userHandle: z.string(),
	currentUserVoteIsUpvote: z.boolean().nullable(),
	isSelected: z.boolean(),
});

export type SegmentTranslation = z.infer<typeof segmentTranslationSchema>;
