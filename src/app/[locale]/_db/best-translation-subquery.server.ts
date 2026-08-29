import type { ExpressionBuilder } from "kysely";
import { db } from "@/db";
import type { DB } from "@/db/types";

type BestTranslationParams = {
	locale: string;
	ownerUserId: string;
};

export function bestTranslationSubquery(
	eb: ExpressionBuilder<DB, keyof DB>,
	{ locale, ownerUserId }: BestTranslationParams,
) {
	const rankedQuery = eb
		.selectFrom("segmentTranslations")
		.leftJoin("translationVotes as ownerTv", (join) =>
			join
				.onRef("ownerTv.translationId", "=", "segmentTranslations.id")
				.on("ownerTv.userId", "=", ownerUserId)
				.on("ownerTv.isUpvote", "=", true),
		)
		.select([
			"segmentTranslations.id",
			"segmentTranslations.segmentId",
			"segmentTranslations.text",
		])
		.select((eb) =>
			eb.fn
				.agg<number>("row_number")
				.over((ob) =>
					ob
						.partitionBy("segmentTranslations.segmentId")
						.orderBy("ownerTv.isUpvote", (ob) => ob.desc().nullsLast())
						.orderBy("segmentTranslations.point", "desc")
						.orderBy("segmentTranslations.createdAt", "desc"),
				)
				.as("rowNumber"),
		)
		.where("segmentTranslations.locale", "=", locale);

	return eb
		.selectFrom(rankedQuery.as("ranked"))
		.select(["ranked.id", "ranked.segmentId", "ranked.text"])
		.where("ranked.rowNumber", "=", 1)
		.orderBy("ranked.segmentId");
}

/**
 * 複数ページ一括取得用のbest translation subquery (軽量版)
 * セグメントからページを辿り、各ページのオーナーのupvoteを優先する
 */
export function bestTranslationByPagesSubquery(locale: string) {
	const rankedQuery = db
		.selectFrom("segmentTranslations")
		.innerJoin(
			"segments as transSeg",
			"segmentTranslations.segmentId",
			"transSeg.id",
		)
		.innerJoin("pages as ownerPage", "transSeg.contentId", "ownerPage.id")
		.leftJoin("translationVotes as ownerTv", (join) =>
			join
				.onRef("ownerTv.translationId", "=", "segmentTranslations.id")
				.onRef("ownerTv.userId", "=", "ownerPage.userId")
				.on("ownerTv.isUpvote", "=", true),
		)
		.select([
			"segmentTranslations.id",
			"segmentTranslations.segmentId",
			"segmentTranslations.text",
		])
		.select((eb) =>
			eb.fn
				.agg<number>("row_number")
				.over((ob) =>
					ob
						.partitionBy("segmentTranslations.segmentId")
						.orderBy("ownerTv.isUpvote", (ob) => ob.desc().nullsLast())
						.orderBy("segmentTranslations.point", "desc")
						.orderBy("segmentTranslations.createdAt", "desc"),
				)
				.as("rowNumber"),
		)
		.where("segmentTranslations.locale", "=", locale);

	return db
		.selectFrom(rankedQuery.as("ranked"))
		.select(["ranked.id", "ranked.segmentId", "ranked.text"])
		.where("ranked.rowNumber", "=", 1)
		.orderBy("ranked.segmentId");
}
