import * as v from "valibot";
import type { TranslationStatus } from "@/drizzle/types";

const translationStatusValues = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"FAILED",
] as const satisfies readonly TranslationStatus[];

const translationJobStatusSchema = v.picklist(translationStatusValues);

export type TranslationJobStatus = v.InferOutput<
	typeof translationJobStatusSchema
>;

export function isTranslationJobTerminalStatus(
	status: TranslationStatus,
): boolean {
	return status === "COMPLETED" || status === "FAILED";
}

const translationJobForToastSchema = v.object({
	id: v.number(),
	locale: v.string(),
	status: translationJobStatusSchema,
	progress: v.number(),
	error: v.string(),
	page: v.object({ slug: v.string() }),
});

const translationJobsForToastSchema = v.array(translationJobForToastSchema);

export type TranslationJobForToast = v.InferOutput<
	typeof translationJobForToastSchema
>;

export const parseTranslationJobsForToast = v.parser(
	translationJobsForToastSchema,
);
