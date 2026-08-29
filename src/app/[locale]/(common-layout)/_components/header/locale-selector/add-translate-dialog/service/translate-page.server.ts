import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import { fetchPageIdBySlug } from "@/app/[locale]/_db/page-utility-queries.server";
import { hasSegmentsForPageId } from "@/app/[locale]/_db/segment-exists.server";
import { enqueueTranslate } from "@/app/[locale]/_infrastructure/qstash/enqueue-translate.server";
import type { TranslationJobForToast } from "@/app/types/translation-job";
import { fetchAnnotationPageIdsForPage } from "../db/queries.server";

/* ───────── 型 ───────── */

interface TranslatePageParams {
	pageSlug: string;
	aiModel: string;
	locale: string;
	userId: string;
}

interface NewJobParams {
	userId: string;
	aiModel: string;
	locale: string;
	pageId: number;
	annotationPageId: number | null;
	jobs: TranslationJobForToast[];
}

/* ───────── ジョブ作成・キュー投入 ───────── */

/** 翻訳ジョブを作成しキューに投入する */
async function createAndEnqueueJob(params: NewJobParams) {
	const targetPageId = params.annotationPageId ?? params.pageId;
	const hasSegments = await hasSegmentsForPageId(targetPageId);
	if (!hasSegments) {
		return;
	}

	const job = await createTranslationJob({
		userId: params.userId,
		aiModel: params.aiModel,
		locale: params.locale,
		pageId: params.pageId,
	});

	params.jobs.push(job);

	// TODO: translationContext をサポートする
	// locale-selector からの翻訳でもユーザーの translationContext を選択できるようにする
	await enqueueTranslate({
		translationJobId: job.id,
		aiModel: params.aiModel,
		userId: params.userId,
		targetLocale: params.locale,
		pageId: params.pageId,
		annotationPageId: params.annotationPageId,
		translationContext: "",
	});
}

/* ───────── ページ翻訳オーケストレーション ───────── */

/**
 * ページ全体の翻訳ジョブを作成する
 * - 本文と注釈それぞれのジョブを作成しキューに投入
 */
export async function translatePage(
	params: TranslatePageParams,
): Promise<
	| { success: true; jobs: TranslationJobForToast[] }
	| { success: false; message: string }
> {
	const page = await fetchPageIdBySlug(params.pageSlug);
	if (!page) return { success: false, message: "Page not found" };
	const pageId = page.id;

	const jobs: TranslationJobForToast[] = [];

	// 本文の翻訳ジョブ
	await createAndEnqueueJob({
		userId: params.userId,
		aiModel: params.aiModel,
		locale: params.locale,
		pageId,
		annotationPageId: null,
		jobs,
	});

	// リンク先の注釈ページも同じ翻訳操作で処理する。
	const annotationPageIds = await fetchAnnotationPageIdsForPage(pageId);
	for (const annotationPageId of annotationPageIds) {
		await createAndEnqueueJob({
			userId: params.userId,
			aiModel: params.aiModel,
			locale: params.locale,
			pageId,
			annotationPageId,
			jobs,
		});
	}

	return { success: true, jobs };
}
