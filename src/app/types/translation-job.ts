import { z } from "zod";
import type { TranslationStatus } from "@/drizzle/types";

const translationStatusValues = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"FAILED",
] as const satisfies readonly TranslationStatus[];

const translationJobStatusSchema = z.enum(translationStatusValues);

export type TranslationJobStatus = z.infer<typeof translationJobStatusSchema>;

export function isTranslationJobTerminalStatus(
	status: TranslationStatus,
): boolean {
	return status === "COMPLETED" || status === "FAILED";
}

export const translationJobForToastSchema = z.object({
	id: z.number(),
	locale: z.string(),
	status: translationJobStatusSchema,
	progress: z.number(),
	error: z.string(),
	page: z.object({ slug: z.string() }),
});

export type TranslationJobForToast = z.infer<
	typeof translationJobForToastSchema
>;
