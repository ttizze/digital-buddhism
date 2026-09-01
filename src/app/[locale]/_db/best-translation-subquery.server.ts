import type { Expression } from "kysely";
import { db } from "@/db";

type BestTranslationTextParams = {
	locale: string;
	segmentId: Expression<number>;
};

/**
 * Select the explicit translation when present, then fall back to vote ranking.
 *
 * ランキング定義: 採用訳 → 得票 → 新しさ → id。
 * tipitaka-read-model/queries.server.ts の queryBestTranslationTextsForPage は
 * 同じランキングのページ一括版。変更する場合は両方を揃えること
 * （乖離は best-translation-subquery.server.integration.test.ts の一致テストが検知する）。
 */
// TODO: 指定したユーザーが投票した訳を採用訳として優先する方式へ変更する。
export function bestTranslationTextSubquery({
	locale,
	segmentId,
}: BestTranslationTextParams) {
	return db
		.selectFrom("segmentTranslations as candidateTranslation")
		.leftJoin("selectedSegmentTranslations as selectedTranslation", (join) =>
			join
				.onRef(
					"selectedTranslation.translationId",
					"=",
					"candidateTranslation.id",
				)
				.onRef(
					"selectedTranslation.segmentId",
					"=",
					"candidateTranslation.segmentId",
				)
				.onRef(
					"selectedTranslation.locale",
					"=",
					"candidateTranslation.locale",
				),
		)
		.select("candidateTranslation.text")
		.where("candidateTranslation.segmentId", "=", segmentId)
		.where("candidateTranslation.locale", "=", locale)
		.orderBy("selectedTranslation.translationId", (ob) => ob.desc().nullsLast())
		.orderBy("candidateTranslation.point", "desc")
		.orderBy("candidateTranslation.createdAt", "desc")
		.orderBy("candidateTranslation.id", "desc")
		.limit(1);
}
