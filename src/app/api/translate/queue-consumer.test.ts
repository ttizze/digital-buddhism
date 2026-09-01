import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TranslateChunkParams, TranslateJobParams } from "./types";

const {
	claimChunkMock,
	completeChunkMock,
	getJobStatusMock,
	markJobFailedMock,
	orchestrateMock,
	processChunkMock,
	releaseChunkMock,
} = vi.hoisted(() => ({
	claimChunkMock: vi.fn(),
	completeChunkMock: vi.fn(),
	getJobStatusMock: vi.fn(),
	markJobFailedMock: vi.fn(),
	orchestrateMock: vi.fn(),
	processChunkMock: vi.fn(),
	releaseChunkMock: vi.fn(),
}));

vi.mock("@/db", () => ({
	db: {
		selectFrom: () => ({
			select: () => ({
				where: () => ({ executeTakeFirst: getJobStatusMock }),
			}),
		}),
	},
}));
vi.mock("./_service/orchestrate-translation.server", () => ({
	orchestrateTranslation: orchestrateMock,
}));
vi.mock("./chunk/_db/mutations.server", () => ({
	claimTranslationChunk: claimChunkMock,
	completeTranslationChunk: completeChunkMock,
	markJobFailed: markJobFailedMock,
	releaseTranslationChunk: releaseChunkMock,
}));
vi.mock("./chunk/_service/process-translation-chunk.server", () => ({
	processTranslationChunk: processChunkMock,
}));

import { consumeTranslationQueue } from "./queue-consumer.server";

const jobParams: TranslateJobParams = {
	userId: "user-1",
	pageId: 1,
	translationJobId: 10,
	aiModel: "gemini-3.1-pro-preview",
	targetLocale: "ja",
	annotationPageId: null,
	translationContext: "",
};

const chunkParams: TranslateChunkParams = {
	...jobParams,
	segments: [{ id: 1, number: 0, text: "Dhamma" }],
	title: "Test",
	totalChunks: 1,
	chunkIndex: 0,
};

const createDelivery = (attempts: number) => ({
	id: `message-${attempts}`,
	body: { type: "chunk" as const, params: chunkParams },
	attempts,
	ack: vi.fn(),
	retry: vi.fn(),
});

describe("consumeTranslationQueue", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getJobStatusMock.mockResolvedValue({ status: "PENDING" });
		claimChunkMock.mockResolvedValue({ status: "claimed" });
	});

	it("成功したメッセージをackする", async () => {
		const delivery = createDelivery(1);

		await consumeTranslationQueue({ messages: [delivery] });

		expect(processChunkMock).toHaveBeenCalledWith(chunkParams);
		expect(completeChunkMock).toHaveBeenCalledWith({
			translationJobId: 10,
			chunkIndex: 0,
			leaseToken: "message-1",
		});
		expect(delivery.ack).toHaveBeenCalledOnce();
		expect(delivery.retry).not.toHaveBeenCalled();
	});

	it("一時失敗は指数バックオフ付きで再配信する", async () => {
		const delivery = createDelivery(2);
		processChunkMock.mockRejectedValueOnce(new Error("temporary"));

		await consumeTranslationQueue({ messages: [delivery] });

		expect(releaseChunkMock).toHaveBeenCalledWith({
			translationJobId: 10,
			chunkIndex: 0,
			leaseToken: "message-2",
		});
		expect(delivery.retry).toHaveBeenCalledWith({ delaySeconds: 60 });
		expect(delivery.ack).not.toHaveBeenCalled();
		expect(markJobFailedMock).not.toHaveBeenCalled();
	});

	it("4回目の失敗でジョブをFAILEDにしてDLQ対象へする", async () => {
		const delivery = createDelivery(4);
		processChunkMock.mockRejectedValueOnce(new Error("permanent"));

		await consumeTranslationQueue({ messages: [delivery] });

		expect(markJobFailedMock).toHaveBeenCalledWith(
			10,
			undefined,
			expect.any(String),
		);
		expect(delivery.ack).not.toHaveBeenCalled();
		expect(delivery.retry).toHaveBeenCalledWith();
	});

	it("オーケストレーションメッセージを処理する", async () => {
		const delivery = {
			id: "orchestrate-message",
			body: { type: "orchestrate" as const, params: jobParams },
			attempts: 1,
			ack: vi.fn(),
			retry: vi.fn(),
		};

		await consumeTranslationQueue({ messages: [delivery] });

		expect(orchestrateMock).toHaveBeenCalledWith(jobParams);
		expect(delivery.ack).toHaveBeenCalledOnce();
	});

	it("終端状態のジョブに残ったメッセージは処理せずackする", async () => {
		const delivery = createDelivery(1);
		getJobStatusMock.mockResolvedValueOnce({ status: "FAILED" });

		await consumeTranslationQueue({ messages: [delivery] });

		expect(processChunkMock).not.toHaveBeenCalled();
		expect(delivery.ack).toHaveBeenCalledOnce();
		expect(delivery.retry).not.toHaveBeenCalled();
	});

	it("完了済みチャンクの重複配信はAPIを呼ばずackする", async () => {
		const delivery = createDelivery(1);
		claimChunkMock.mockResolvedValueOnce({ status: "completed" });

		await consumeTranslationQueue({ messages: [delivery] });

		expect(processChunkMock).not.toHaveBeenCalled();
		expect(delivery.ack).toHaveBeenCalledOnce();
	});

	it("処理中チャンクの重複配信はリース期限後へ遅延する", async () => {
		const delivery = createDelivery(1);
		claimChunkMock.mockResolvedValueOnce({
			status: "busy",
			retryAfterSeconds: 600,
		});

		await consumeTranslationQueue({ messages: [delivery] });

		expect(processChunkMock).not.toHaveBeenCalled();
		expect(delivery.retry).toHaveBeenCalledWith({ delaySeconds: 600 });
		expect(delivery.ack).not.toHaveBeenCalled();
	});
});
