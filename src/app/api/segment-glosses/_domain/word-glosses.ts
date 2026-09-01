import { z } from "zod";

const createdAtSchema = z.union([z.string(), z.date()]);

export const wordGlossSchema = z.object({
	id: z.number(),
	wordId: z.number(),
	locale: z.string(),
	text: z.string(),
	point: z.number(),
	createdAt: createdAtSchema,
	userName: z.string(),
	userHandle: z.string(),
	currentUserVoteIsUpvote: z.boolean().nullable(),
	isSelected: z.boolean(),
});

export const segmentWordWithGlossSchema = z.object({
	id: z.number(),
	segmentId: z.number(),
	position: z.number(),
	startOffset: z.number(),
	endOffset: z.number(),
	surface: z.string(),
	gloss: wordGlossSchema,
});

export const wordGlossVoteResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		glosses: wordGlossSchema.array(),
	}),
});

export type WordGloss = z.infer<typeof wordGlossSchema>;
export type SegmentWordWithGloss = z.infer<typeof segmentWordWithGlossSchema>;
export type WordGlossVoteResponse = z.infer<typeof wordGlossVoteResponseSchema>;
