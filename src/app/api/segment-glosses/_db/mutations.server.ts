import { sql } from "kysely";
import { computeVoteOutcome } from "@/app/api/_domain/vote-outcome";
import { db } from "@/db";

export async function addWordGloss(
	wordId: number,
	locale: string,
	text: string,
	userId: string,
) {
	return db
		.insertInto("wordGlosses")
		.values({ wordId, locale, text, userId })
		.returning("id")
		.executeTakeFirst();
}

export async function deleteOwnWordGloss(glossId: number, userId: string) {
	return db
		.deleteFrom("wordGlosses")
		.where("id", "=", glossId)
		.where("userId", "=", userId)
		.returning("id")
		.executeTakeFirst();
}

export async function handleWordGlossVote(
	glossId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	return db.transaction().execute(async (tx) => {
		const context = await tx
			.selectFrom("wordGlosses as gloss")
			.leftJoin("wordGlossVotes as vote", (join) =>
				join
					.onRef("vote.glossId", "=", "gloss.id")
					.on("vote.userId", "=", currentUserId),
			)
			.select([
				"gloss.wordId",
				"gloss.locale",
				"vote.isUpvote as previousIsUpvote",
			])
			.where("gloss.id", "=", glossId)
			.executeTakeFirst();

		if (!context) return null;

		const outcome = computeVoteOutcome(
			context.previousIsUpvote ?? undefined,
			isUpvote,
		);

		if (outcome.action === "delete") {
			await tx
				.deleteFrom("wordGlossVotes")
				.where("glossId", "=", glossId)
				.where("userId", "=", currentUserId)
				.execute();
		} else if (outcome.action === "update") {
			await tx
				.updateTable("wordGlossVotes")
				.set({ isUpvote, updatedAt: new Date() })
				.where("glossId", "=", glossId)
				.where("userId", "=", currentUserId)
				.execute();
		} else {
			await tx
				.insertInto("wordGlossVotes")
				.values({ glossId, userId: currentUserId, isUpvote })
				.execute();
		}

		await tx
			.updateTable("wordGlosses")
			.set({ point: sql`point + ${outcome.pointDelta}` })
			.where("id", "=", glossId)
			.execute();

		return { wordId: context.wordId, locale: context.locale };
	});
}
