import { sql } from "kysely";
import { db } from "@/db";

export async function fetchUserByHandle(handle: string) {
	return db
		.selectFrom("users")
		.select(["id", "handle", "name", "image", "profile", "twitterHandle"])
		.where("handle", "=", handle)
		.executeTakeFirst();
}

export type UserTranslationContribution = {
	id: number;
	pageSlug: string;
	segmentId: number;
	segmentNumber: number;
	sourceText: string;
	locale: string;
	text: string;
	point: number;
	createdAt: Date;
};

export async function fetchUserTranslationContributions({
	userId,
	page,
	pageSize,
}: {
	userId: string;
	page: number;
	pageSize: number;
}): Promise<{
	contributions: UserTranslationContribution[];
	totalPages: number;
}> {
	const offset = (page - 1) * pageSize;
	const [contributions, countResult] = await Promise.all([
		db
			.selectFrom("segmentTranslations")
			.innerJoin("segments", "segments.id", "segmentTranslations.segmentId")
			.innerJoin("tipitakaPages", "tipitakaPages.id", "segments.tipitakaPageId")
			.select([
				"segmentTranslations.id",
				"tipitakaPages.slug as pageSlug",
				"segments.id as segmentId",
				"segments.number as segmentNumber",
				"segments.text as sourceText",
				"segmentTranslations.locale",
				"segmentTranslations.text",
				"segmentTranslations.point",
				"segmentTranslations.createdAt",
			])
			.where("segmentTranslations.userId", "=", userId)
			.orderBy("segmentTranslations.createdAt", "desc")
			.limit(pageSize)
			.offset(offset)
			.execute(),
		db
			.selectFrom("segmentTranslations")
			.select(sql<number>`count(*)`.as("count"))
			.where("userId", "=", userId)
			.executeTakeFirst(),
	]);
	return {
		contributions,
		totalPages: Math.ceil(Number(countResult?.count ?? 0) / pageSize),
	};
}
