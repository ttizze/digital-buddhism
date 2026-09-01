import {
	createTranslationJob,
	failActiveTranslationJobs,
} from "@/app/[locale]/_db/mutations.server";
import {
	fetchPageIdBySlug,
	hasSegmentsForPageId,
} from "@/app/[locale]/_db/queries";
import { enqueueTranslationMessage } from "@/app/[locale]/_infrastructure/translation-queue/context.server";
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
}

/* ───────── ジョブ作成・キュー投入 ───────── */

/** 翻訳ジョブを作成しキューに投入する */
async function createAndEnqueueJob(
	params: NewJobParams,
): Promise<TranslationJobForToast | null> {
	const targetPageId = params.annotationPageId ?? params.pageId;
	const hasSegments = await hasSegmentsForPageId(targetPageId);
	if (!hasSegments) {
		return null;
	}

	const job = await createTranslationJob({
		userId: params.userId,
		aiModel: params.aiModel,
		locale: params.locale,
		pageId: params.pageId,
	});

	// TODO: translationContext をサポートする
	// locale-selector からの翻訳でもユーザーの translationContext を選択できるようにする
	await enqueueTranslationMessage({
		type: "orchestrate",
		params: {
			translationJobId: job.id,
			aiModel: params.aiModel,
			targetLocale: params.locale,
			pageId: params.pageId,
			annotationPageId: params.annotationPageId,
			translationContext: "",
		},
	});

	return job;
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
	await failActiveTranslationJobs({
		pageId,
		userId: params.userId,
		locale: params.locale,
		aiModel: params.aiModel,
		reason: "Superseded by a new translation run",
	});

	const [mainJob, annotationPageIds] = await Promise.all([
		createAndEnqueueJob({
			userId: params.userId,
			aiModel: params.aiModel,
			locale: params.locale,
			pageId,
			annotationPageId: null,
		}),
		fetchAnnotationPageIdsForPage(pageId),
	]);

	// リンク先の注釈ページも同じ翻訳操作で処理する。
	const annotationJobs = await Promise.all(
		annotationPageIds.map((annotationPageId) =>
			createAndEnqueueJob({
				userId: params.userId,
				aiModel: params.aiModel,
				locale: params.locale,
				pageId,
				annotationPageId,
			}),
		),
	);
	const jobs = [mainJob, ...annotationJobs].filter(
		(job): job is TranslationJobForToast => job !== null,
	);

	return { success: true, jobs };
}
