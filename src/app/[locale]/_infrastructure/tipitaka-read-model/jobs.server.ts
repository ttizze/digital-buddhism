import { serverLogger } from "@/app/_service/logger.server";
import { db } from "@/db";
import {
	publishHomeTranslationOverlay,
	publishPageState,
	publishPageTranslationOverlay,
} from "./publisher.server";

export async function processPendingTipitakaReadModelJobs(
	limit = 10,
): Promise<number> {
	const jobs = await db
		.selectFrom("tipitakaReadModelJobs")
		.select(["pageId", "locale", "requestedAt", "attempts"])
		.orderBy("requestedAt")
		.limit(limit)
		.execute();
	let completed = 0;

	for (const job of jobs) {
		try {
			await Promise.all([
				publishPageTranslationOverlay(job.pageId, job.locale),
				publishPageState(job.pageId),
				publishHomeTranslationOverlay(job.locale),
			]);
			await db
				.deleteFrom("tipitakaReadModelJobs")
				.where("pageId", "=", job.pageId)
				.where("locale", "=", job.locale)
				.where("requestedAt", "=", job.requestedAt)
				.execute();
			completed += 1;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			serverLogger.error(
				{
					err: error,
					pageId: job.pageId,
					locale: job.locale,
					attempt: job.attempts + 1,
				},
				"Tipitaka read model publication failed",
			);
			await db
				.updateTable("tipitakaReadModelJobs")
				.set({
					attempts: job.attempts + 1,
					lastError: message.slice(0, 500),
				})
				.where("pageId", "=", job.pageId)
				.where("locale", "=", job.locale)
				.where("requestedAt", "=", job.requestedAt)
				.execute();
		}
	}
	return completed;
}
