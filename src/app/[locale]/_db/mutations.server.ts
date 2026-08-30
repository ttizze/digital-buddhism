import { db } from "@/db";

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
	const [translationJob, pageData] = await Promise.all([
		db
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
			.executeTakeFirstOrThrow(),
		db
			.selectFrom("tipitakaPages")
			.select("slug as pageSlug")
			.where("id", "=", params.pageId)
			.executeTakeFirst(),
	]);

	if (!pageData) {
		throw new Error("Page not found");
	}

	return {
		...translationJob,
		page: { slug: pageData.pageSlug },
	};
}
