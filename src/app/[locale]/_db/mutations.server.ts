import { db } from "@/db";
import { TIPITAKA_SYSTEM_USER_HANDLE } from "../_domain/tipitaka-page-visibility";

type CreateTranslationJobParams = {
	aiModel: string;
	locale: string;
	userId?: string;
	pageId: number;
};

/**
 * 翻訳ジョブを作成
 * Kyselyに移行済み
 */
export async function createTranslationJob(params: CreateTranslationJobParams) {
	// 1. 翻訳ジョブを作成
	const translationJob = await db
		.insertInto("translationJobs")
		.values({
			aiModel: params.aiModel,
			locale: params.locale,
			userId: params.userId,
			pageId: params.pageId,
			status: "PENDING",
			progress: 0,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	// 2. ページとユーザー情報を取得
	const pageData = await db
		.selectFrom("tipitakaPages")
		.select("slug as pageSlug")
		.where("id", "=", params.pageId)
		.executeTakeFirst();

	if (!pageData) {
		throw new Error("Page not found");
	}

	return {
		...translationJob,
		page: {
			slug: pageData.pageSlug,
			user: {
				handle: TIPITAKA_SYSTEM_USER_HANDLE,
			},
		},
	};
}
