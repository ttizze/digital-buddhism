import { db } from "@/db";

type CreateTranslationJobParams = {
	aiModel: string;
	locale: string;
	userId?: string;
	pageId: number;
};

/**
 * 翻訳ジョブを作成
 * 戻り値はクライアントへ渡るため、トースト表示に必要な列だけを返す
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
			.returning(["id", "locale", "status", "progress", "error"])
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

export async function failActiveTranslationJobs(params: {
	pageId: number;
	userId: string;
	locale: string;
	aiModel: string;
	reason: string;
}) {
	await db
		.updateTable("translationJobs")
		.set({ status: "FAILED", error: params.reason })
		.where("pageId", "=", params.pageId)
		.where("userId", "=", params.userId)
		.where("locale", "=", params.locale)
		.where("aiModel", "=", params.aiModel)
		.where("status", "in", ["PENDING", "IN_PROGRESS"])
		.execute();
}
