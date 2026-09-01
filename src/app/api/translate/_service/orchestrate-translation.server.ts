/**
 * 翻訳ジョブのオーケストレーション
 *
 * ファンアウトパターンを採用:
 * 呼び出し元 → Cloudflare Queue → orchestrate
 *                                  ↓
 *                            Queue → chunk ×N
 *
 * この設計により以下を実現:
 * - 分離処理: 各チャンクを独立したメッセージとして翻訳
 * - 部分失敗の分離: 失敗したチャンクのみリトライ
 * - タイムアウト回避: 各ワーカーが独立して時間を使用
 */

import { enqueueTranslationMessages } from "@/app/[locale]/_infrastructure/translation-queue/context.server";
import { markJobCompleted, markJobInProgress } from "../_db/mutations.server";
import { getPageSegments, getPageTitle } from "../_db/queries.server";
import { splitSegments } from "../_domain/split-segments";
import type { TranslateChunkParams, TranslateJobParams } from "../types";

export async function orchestrateTranslation(params: TranslateJobParams) {
	const segments = await getPageSegments(
		params.annotationPageId ?? params.pageId,
	);

	// ページタイトルを取得（翻訳プロンプト用）
	const title = (await getPageTitle(params.pageId)) ?? "";

	const sortedSegments = [...segments].sort((a, b) => a.number - b.number);
	const chunks = splitSegments(sortedSegments, params.aiModel);
	const totalChunks = chunks.length;
	console.info("Translation chunks prepared", {
		translationJobId: params.translationJobId,
		pageId: params.pageId,
		targetLocale: params.targetLocale,
		aiModel: params.aiModel,
		totalChunks,
	});

	// If there is nothing to translate, finalize immediately.
	if (totalChunks === 0) {
		await markJobCompleted(params.translationJobId);
		return { ok: true };
	}

	// Mark job started only when there is work to do
	await markJobInProgress(params.translationJobId);

	await enqueueTranslationMessages(
		chunks.map((chunk, idx) => {
			const body: TranslateChunkParams = {
				translationJobId: params.translationJobId,
				aiModel: params.aiModel,
				userId: params.userId,
				targetLocale: params.targetLocale,
				pageId: params.pageId,
				annotationPageId: params.annotationPageId,
				segments: chunk,
				title,
				totalChunks,
				chunkIndex: idx,
				translationContext: params.translationContext,
			};
			return { type: "chunk" as const, params: body };
		}),
	);

	return { ok: true };
}
