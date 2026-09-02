import { isTranslationJobTerminalStatus } from "@/app/types/translation-job";
import { db } from "@/db";
import { markJobFailed } from "./_db/mutations.server";
import { orchestrateTranslation } from "./_service/orchestrate-translation.server";
import {
	claimTranslationChunk,
	completeTranslationChunk,
	releaseTranslationChunk,
} from "./chunk/_db/mutations.server";
import { processTranslationChunk } from "./chunk/_service/process-translation-chunk.server";
import { formatErrorMessage } from "./chunk/_utils/format-error-message";
import type { TranslationQueueMessage } from "./types";

// max_retries=3 in wrangler.jsonc means one initial delivery plus three retries.
const MAX_QUEUE_DELIVERY_ATTEMPTS = 4;
const BASE_RETRY_DELAY_SECONDS = 30;

export type TranslationQueueDelivery = {
	id: string;
	body: TranslationQueueMessage;
	attempts: number;
	ack(): void;
	retry(options?: { delaySeconds?: number }): void;
};

export type TranslationQueueBatch = {
	messages: readonly TranslationQueueDelivery[];
};

const retryDelaySeconds = (attempts: number) =>
	BASE_RETRY_DELAY_SECONDS * 2 ** Math.max(0, attempts - 1);

async function isTerminalTranslationJob(translationJobId: number) {
	const job = await db
		.selectFrom("translationJobs")
		.select("status")
		.where("id", "=", translationJobId)
		.executeTakeFirst();
	return !job || isTranslationJobTerminalStatus(job.status);
}

export async function consumeTranslationQueue(
	batch: TranslationQueueBatch,
): Promise<void> {
	for (const message of batch.messages) {
		let claimedChunk: { translationJobId: number; chunkIndex: number } | null =
			null;
		try {
			const { translationJobId } = message.body.params;
			if (await isTerminalTranslationJob(translationJobId)) {
				console.info("Skipping terminal translation job message", {
					translationJobId,
					messageType: message.body.type,
				});
				message.ack();
				continue;
			}
			if (message.body.type === "orchestrate") {
				await orchestrateTranslation(message.body.params);
			} else {
				const { translationJobId, chunkIndex } = message.body.params;
				const claim = await claimTranslationChunk({
					translationJobId,
					chunkIndex,
					leaseToken: message.id,
				});
				if (claim.status === "completed") {
					message.ack();
					continue;
				}
				if (claim.status === "busy") {
					if (message.attempts >= MAX_QUEUE_DELIVERY_ATTEMPTS) {
						await markJobFailed(
							translationJobId,
							null,
							`Translation chunk ${chunkIndex} remained busy through the final queue delivery`,
						);
						message.retry();
						continue;
					}
					message.retry({ delaySeconds: claim.retryAfterSeconds });
					continue;
				}

				claimedChunk = { translationJobId, chunkIndex };
				await processTranslationChunk(message.body.params);
				await completeTranslationChunk({
					...claimedChunk,
					leaseToken: message.id,
				});
				claimedChunk = null;
			}
			message.ack();
		} catch (error) {
			const { translationJobId } = message.body.params;
			if (claimedChunk) {
				try {
					await releaseTranslationChunk({
						...claimedChunk,
						leaseToken: message.id,
					});
				} catch (releaseError) {
					console.error("Failed to release translation chunk", {
						...claimedChunk,
						releaseError,
					});
				}
			}
			const rawErrorMessage =
				error instanceof Error ? error.message : String(error);
			console.error("Translation queue message failed", {
				translationJobId,
				messageType: message.body.type,
				attempts: message.attempts,
				errorMessage: rawErrorMessage,
				error,
			});
			if (message.attempts >= MAX_QUEUE_DELIVERY_ATTEMPTS) {
				await markJobFailed(translationJobId, null, formatErrorMessage(error));
				// Do not acknowledge the final failure. Cloudflare moves it to the DLQ.
				message.retry();
				continue;
			}

			message.retry({
				delaySeconds: retryDelaySeconds(message.attempts),
			});
		}
	}
}
