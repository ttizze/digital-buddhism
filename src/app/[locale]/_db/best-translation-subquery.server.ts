import type { Expression } from "kysely";
import { db } from "@/db";

type BestTranslationTextParams = {
	locale: string;
	segmentId: Expression<number>;
};

/** Select the explicit translation when present, then fall back to vote ranking. */
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
