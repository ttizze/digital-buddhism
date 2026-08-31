import type { Transaction } from "kysely";
import { sql } from "kysely";
import {
	computeVoteOutcome,
	type VoteOutcome,
} from "@/app/api/_domain/vote-outcome";
import { db } from "@/db";
import type { DB } from "@/db/types";
import { calcProofStatus } from "../_lib/translation-proof-status";

export async function handleVote(
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
) {
	return db.transaction().execute(async (tx) => {
		const context = await tx
			.selectFrom("segmentTranslations")
			.innerJoin("segments", "segmentTranslations.segmentId", "segments.id")
			.innerJoin("tipitakaPages", "segments.tipitakaPageId", "tipitakaPages.id")
			.leftJoin("translationVotes", (join) =>
				join
					.onRef(
						"translationVotes.translationId",
						"=",
						"segmentTranslations.id",
					)
					.on("translationVotes.userId", "=", currentUserId),
			)
			.select([
				"segmentTranslations.segmentId",
				"segmentTranslations.locale",
				"tipitakaPages.id as pageId",
				"translationVotes.isUpvote as previousIsUpvote",
			])
			.where("segmentTranslations.id", "=", segmentTranslationId)
			.executeTakeFirst();

		if (!context) {
			throw new Error("Translation not found");
		}

		const outcome = computeVoteOutcome(
			context.previousIsUpvote ?? undefined,
			isUpvote,
		);
		await applyVote(
			tx,
			segmentTranslationId,
			isUpvote,
			currentUserId,
			outcome,
			context.pageId,
			context.locale,
		);

		return {
			segmentId: context.segmentId,
			locale: context.locale,
			isUpvote: outcome.finalIsUpvote,
		};
	});
}

async function applyVote(
	tx: Transaction<DB>,
	segmentTranslationId: number,
	isUpvote: boolean,
	currentUserId: string,
	outcome: VoteOutcome,
	pageId: number,
	locale: string,
) {
	if (outcome.action === "delete") {
		await tx
			.deleteFrom("translationVotes")
			.where("translationId", "=", segmentTranslationId)
			.where("userId", "=", currentUserId)
			.execute();
	} else if (outcome.action === "update") {
		await tx
			.updateTable("translationVotes")
			.set({ isUpvote })
			.where("translationId", "=", segmentTranslationId)
			.where("userId", "=", currentUserId)
			.execute();
	} else {
		await tx
			.insertInto("translationVotes")
			.values({
				translationId: segmentTranslationId,
				userId: currentUserId,
				isUpvote,
			})
			.execute();
	}

	await tx
		.updateTable("segmentTranslations")
		.set({ point: sql`point + ${outcome.pointDelta}` })
		.where("id", "=", segmentTranslationId)
		.execute();

	await updateProofStatus(tx, pageId, locale);
}

async function updateProofStatus(
	tx: Transaction<DB>,
	pageId: number,
	locale: string,
) {
	const stats = await tx
		.selectFrom("segments")
		.innerJoin("tipitakaPages", "segments.tipitakaPageId", "tipitakaPages.id")
		.leftJoin("segmentTranslations", (join) =>
			join
				.onRef("segmentTranslations.segmentId", "=", "segments.id")
				.on("segmentTranslations.locale", "=", locale),
		)
		.select([
			sql<number>`cast(count(*) as integer)`.as("totalSegments"),
			sql<number>`cast(count(case when segment_translations.point >= 1 then 1 end) as integer)`.as(
				"segmentsWith1PlusVotes",
			),
			sql<number>`cast(count(case when segment_translations.point >= 2 then 1 end) as integer)`.as(
				"segmentsWith2PlusVotes",
			),
		])
		.where("tipitakaPages.id", "=", pageId)
		.executeTakeFirst();

	const { totalSegments, segmentsWith1PlusVotes, segmentsWith2PlusVotes } =
		stats ?? {
			totalSegments: 0,
			segmentsWith1PlusVotes: 0,
			segmentsWith2PlusVotes: 0,
		};
	if (totalSegments === 0) return;

	const newStatus = calcProofStatus(
		totalSegments,
		segmentsWith1PlusVotes,
		segmentsWith2PlusVotes,
	);
	await tx
		.insertInto("pageLocaleTranslationProofs")
		.values({ pageId, locale, translationProofStatus: newStatus })
		.onConflict((oc) =>
			oc.columns(["pageId", "locale"]).doUpdateSet({
				translationProofStatus: newStatus,
			}),
		)
		.execute();
}

export async function createNotificationPageSegmentTranslationVote(
	translationId: number,
	actorId: string,
) {
	const segmentTranslation = await db
		.selectFrom("segmentTranslations")
		.select("userId")
		.where("id", "=", translationId)
		.executeTakeFirst();

	if (!segmentTranslation) return;

	await db
		.insertInto("notifications")
		.values({
			segmentTranslationId: translationId,
			userId: segmentTranslation.userId,
			actorId,
		})
		.execute();
}
