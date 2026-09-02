import { AsyncLocalStorage } from "node:async_hooks";
import type {
	TranslationQueueBinding,
	TranslationQueueMessage,
} from "@/app/api/translate/types";

const storage = new AsyncLocalStorage<TranslationQueueBinding>();

export function runWithTranslationQueue<T>(
	queue: TranslationQueueBinding,
	fn: () => T | Promise<T>,
): Promise<T> {
	return storage.run(queue, async () => fn());
}

function getTranslationQueue(): TranslationQueueBinding {
	const queue = storage.getStore();
	if (!queue) throw new Error("TRANSLATION_QUEUE binding is not configured");
	return queue;
}

export function enqueueTranslationMessage(
	message: TranslationQueueMessage,
): Promise<void> {
	return getTranslationQueue().send(message);
}

export async function enqueueTranslationMessages(
	messages: readonly TranslationQueueMessage[],
): Promise<void> {
	const queue = getTranslationQueue();
	await Promise.all(messages.map((message) => queue.send(message)));
}
