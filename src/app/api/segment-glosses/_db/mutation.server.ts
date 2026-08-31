import { sql } from "kysely";
import { computeVoteOutcome } from "@/app/api/_domain/vote-outcome";
import { db } from "@/db";

export async function handleGlossUnitVote(
	glossUnitId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	return db.transaction().execute(async (tx) => {
		const context = await tx
			.selectFrom("segmentGlossUnits as unit")
			.leftJoin("segmentGlossUnitVotes as vote", (join) =>
				join
					.onRef("vote.glossUnitId", "=", "unit.id")
					.on("vote.userId", "=", currentUserId),
			)
			.select(["unit.id", "vote.isUpvote as previousIsUpvote"])
			.where("unit.id", "=", glossUnitId)
			.executeTakeFirst();

		if (!context) return null;

		const outcome = computeVoteOutcome(
			context.previousIsUpvote ?? undefined,
			isUpvote,
		);

		if (outcome.action === "delete") {
			await tx
				.deleteFrom("segmentGlossUnitVotes")
				.where("glossUnitId", "=", glossUnitId)
				.where("userId", "=", currentUserId)
				.execute();
		} else if (outcome.action === "update") {
			await tx
				.updateTable("segmentGlossUnitVotes")
				.set({ isUpvote, updatedAt: new Date() })
				.where("glossUnitId", "=", glossUnitId)
				.where("userId", "=", currentUserId)
				.execute();
		} else {
			await tx
				.insertInto("segmentGlossUnitVotes")
				.values({ glossUnitId, userId: currentUserId, isUpvote })
				.execute();
		}

		const glossUnit = await tx
			.updateTable("segmentGlossUnits")
			.set({ point: sql`point + ${outcome.pointDelta}` })
			.where("id", "=", glossUnitId)
			.returning(["id", "point"])
			.executeTakeFirstOrThrow();

		return {
			...glossUnit,
			currentUserVoteIsUpvote: outcome.finalIsUpvote ?? null,
		};
	});
}
