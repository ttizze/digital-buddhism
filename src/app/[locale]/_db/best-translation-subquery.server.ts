import type { Expression } from "kysely";
import { db } from "@/db";

type BestTranslationTextParams = {
	locale: string;
	ownerId: Expression<string>;
	segmentId: Expression<number>;
};

/**
 * 対象セグメントの翻訳候補だけを順位付けし、最良の本文を返す。
 *
 * 順位はページオーナーのupvote、ポイント、作成日時の順。
 * 呼び出し側から値または外側の列参照を渡せるため、単一ページと
 * 複数ページのどちらでも同じ選択規則を使う。
 */
export function bestTranslationTextSubquery({
	locale,
	ownerId,
	segmentId,
}: BestTranslationTextParams) {
	return db
		.selectFrom("segmentTranslations as candidateTranslation")
		.leftJoin("translationVotes as ownerVote", (join) =>
			join
				.onRef("ownerVote.translationId", "=", "candidateTranslation.id")
				.on("ownerVote.userId", "=", ownerId)
				.on("ownerVote.isUpvote", "=", true),
		)
		.select("candidateTranslation.text")
		.where("candidateTranslation.segmentId", "=", segmentId)
		.where("candidateTranslation.locale", "=", locale)
		.orderBy("ownerVote.isUpvote", (ob) => ob.desc().nullsLast())
		.orderBy("candidateTranslation.point", "desc")
		.orderBy("candidateTranslation.createdAt", "desc")
		.limit(1);
}
