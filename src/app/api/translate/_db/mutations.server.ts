import { db } from "@/db";
import type { TranslationStatus } from "@/drizzle/types";

interface FailedJobUpdate {
	status: TranslationStatus;
	error: string;
	progress?: number;
}

// Convenience helpers to avoid scattering raw status writes around the codebase
export async function markJobInProgress(translationJobId: number) {
	await db
		.updateTable("translationJobs")
		.set({ status: "IN_PROGRESS" satisfies TranslationStatus, progress: 0 })
		.where("id", "=", translationJobId)
		.execute();
}

export async function markJobCompleted(translationJobId: number) {
	await db
		.updateTable("translationJobs")
		.set({ status: "COMPLETED" satisfies TranslationStatus, progress: 100 })
		.where("id", "=", translationJobId)
		.execute();
}

export async function markJobFailed(
	translationJobId: number,
	progress: number | null,
	errorMessage: string,
) {
	const update: FailedJobUpdate = {
		status: "FAILED",
		error: errorMessage,
	};
	if (progress !== null) update.progress = progress;

	await db
		.updateTable("translationJobs")
		.set(update)
		.where("id", "=", translationJobId)
		.execute();
}
