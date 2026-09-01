import { db } from "@/db";
import type { TranslationStatus } from "@/drizzle/types";

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
	progress?: number,
	errorMessage?: string,
) {
	await db
		.updateTable("translationJobs")
		.set({
			status: "FAILED" satisfies TranslationStatus,
			...(progress === undefined ? {} : { progress }),
			error: errorMessage ?? "",
		})
		.where("id", "=", translationJobId)
		.execute();
}
