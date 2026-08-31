import { z } from "zod";

export const segmentGlossUnitSchema = z.object({
	id: z.number(),
	segmentId: z.number(),
	position: z.number(),
	startOffset: z.number(),
	endOffset: z.number(),
	surface: z.string(),
	gloss: z.string(),
	point: z.number(),
	currentUserVoteIsUpvote: z.boolean().nullable(),
});

export const segmentGlossVoteResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		glossUnit: segmentGlossUnitSchema.pick({
			id: true,
			point: true,
			currentUserVoteIsUpvote: true,
		}),
	}),
});

export type SegmentGlossUnit = z.infer<typeof segmentGlossUnitSchema>;
export type SegmentGlossVoteResponse = z.infer<
	typeof segmentGlossVoteResponseSchema
>;
