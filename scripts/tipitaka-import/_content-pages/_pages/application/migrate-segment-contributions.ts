import { sql } from "kysely";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import { db } from "@/db";

const CONTRIBUTION_MOVE_CHUNK_SIZE = 200;
const HTML_SPAN_PATTERN = /<span\b[^>]*>[\s\S]*?<\/span>/g;

type ContributionSegment = {
	id: number;
	text: string;
};

type ContributionMove = {
	sourceSegmentId: number;
	targetSegmentId: number;
};

function matchingText(text: string): string {
	return text
		.replace(HTML_SPAN_PATTERN, "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

async function fetchSourceSegmentsWithContributions(
	tx: TransactionClient,
	pageId: number,
): Promise<ContributionSegment[]> {
	return tx
		.selectFrom("segments as sourceSegment")
		.select(["sourceSegment.id", "sourceSegment.text"])
		.where("sourceSegment.tipitakaPageId", "=", pageId)
		.where("sourceSegment.number", ">", 0)
		.where((eb) =>
			eb.or([
				eb.exists(
					eb
						.selectFrom("segmentTranslations")
						.select("segmentTranslations.id")
						.whereRef("segmentTranslations.segmentId", "=", "sourceSegment.id"),
				),
				eb.exists(
					eb
						.selectFrom("segmentGlossSets")
						.select("segmentGlossSets.id")
						.whereRef("segmentGlossSets.segmentId", "=", "sourceSegment.id"),
				),
			]),
		)
		.orderBy("sourceSegment.number")
		.execute();
}

async function fetchTargetSegmentsWithoutContributions(
	tx: TransactionClient,
	pageId: number,
): Promise<ContributionSegment[]> {
	return tx
		.selectFrom("segments as targetSegment")
		.select(["targetSegment.id", "targetSegment.text"])
		.where("targetSegment.tipitakaPageId", "=", pageId)
		.where((eb) =>
			eb.and([
				eb.not(
					eb.exists(
						eb
							.selectFrom("segmentTranslations")
							.select("segmentTranslations.id")
							.whereRef(
								"segmentTranslations.segmentId",
								"=",
								"targetSegment.id",
							),
					),
				),
				eb.not(
					eb.exists(
						eb
							.selectFrom("segmentGlossSets")
							.select("segmentGlossSets.id")
							.whereRef("segmentGlossSets.segmentId", "=", "targetSegment.id"),
					),
				),
			]),
		)
		.orderBy("targetSegment.number")
		.execute();
}

function matchContributionMoves(
	sourceSegments: ContributionSegment[],
	targetSegments: ContributionSegment[],
): ContributionMove[] {
	const sourcesByText = new Map<string, ContributionSegment[]>();
	for (const sourceSegment of sourceSegments) {
		const key = matchingText(sourceSegment.text);
		const sources = sourcesByText.get(key) ?? [];
		sources.push(sourceSegment);
		sourcesByText.set(key, sources);
	}

	const moves: ContributionMove[] = [];
	for (const targetSegment of targetSegments) {
		const sources = sourcesByText.get(matchingText(targetSegment.text));
		const sourceSegment = sources?.shift();
		if (!sourceSegment) continue;
		moves.push({
			sourceSegmentId: sourceSegment.id,
			targetSegmentId: targetSegment.id,
		});
	}
	return moves;
}

async function moveContributionRows(
	tx: TransactionClient,
	moves: ContributionMove[],
): Promise<void> {
	for (
		let index = 0;
		index < moves.length;
		index += CONTRIBUTION_MOVE_CHUNK_SIZE
	) {
		const chunk = moves.slice(index, index + CONTRIBUTION_MOVE_CHUNK_SIZE);
		const sourceSegmentIds = chunk.map((move) => move.sourceSegmentId);
		const segmentIdCase = sql<number>`case ${sql.join(
			chunk.map(
				(move) =>
					sql`when segment_id = ${move.sourceSegmentId} then ${move.targetSegmentId}`,
			),
			sql` `,
		)} else segment_id end`;

		await tx
			.updateTable("segmentTranslations")
			.set({ segmentId: segmentIdCase })
			.where("segmentId", "in", sourceSegmentIds)
			.execute();
		await tx
			.updateTable("segmentGlossSets")
			.set({ segmentId: segmentIdCase })
			.where("segmentId", "in", sourceSegmentIds)
			.execute();
	}
}

async function copyCompletedTranslationState(
	tx: TransactionClient,
	sourcePageId: number,
	targetPageId: number,
): Promise<void> {
	const targetSegmentCount = await tx
		.selectFrom("segments")
		.select(({ fn }) => fn.countAll<number>().as("count"))
		.where("tipitakaPageId", "=", targetPageId)
		.executeTakeFirstOrThrow();
	const translatedLocales = await tx
		.selectFrom("segmentTranslations")
		.innerJoin("segments", "segments.id", "segmentTranslations.segmentId")
		.select("segmentTranslations.locale")
		.select(
			sql<number>`count(distinct ${sql.ref("segments.id")})`.as(
				"translatedSegmentCount",
			),
		)
		.where("segments.tipitakaPageId", "=", targetPageId)
		.groupBy("segmentTranslations.locale")
		.execute();
	const completedLocales = new Set(
		translatedLocales
			.filter((row) => row.translatedSegmentCount === targetSegmentCount.count)
			.map((row) => row.locale),
	);
	if (completedLocales.size === 0) return;

	const [sourceJobs, existingTargetJobs] = await Promise.all([
		tx
			.selectFrom("translationJobs")
			.selectAll()
			.where("pageId", "=", sourcePageId)
			.where("status", "=", "COMPLETED")
			.orderBy("updatedAt", "desc")
			.execute(),
		tx
			.selectFrom("translationJobs")
			.select("locale")
			.where("pageId", "=", targetPageId)
			.where("status", "=", "COMPLETED")
			.execute(),
	]);
	const existingLocales = new Set(existingTargetJobs.map((job) => job.locale));
	const sourceJobByLocale = new Map<string, (typeof sourceJobs)[number]>();
	for (const sourceJob of sourceJobs) {
		if (!sourceJobByLocale.has(sourceJob.locale)) {
			sourceJobByLocale.set(sourceJob.locale, sourceJob);
		}
	}
	const jobsToCopy = [...completedLocales]
		.filter((locale) => !existingLocales.has(locale))
		.flatMap((locale) => {
			const sourceJob = sourceJobByLocale.get(locale);
			if (!sourceJob) return [];
			return [
				{
					pageId: targetPageId,
					userId: sourceJob.userId,
					locale: sourceJob.locale,
					aiModel: sourceJob.aiModel,
					status: sourceJob.status,
					progress: sourceJob.progress,
					error: sourceJob.error,
					createdAt: sourceJob.createdAt,
					updatedAt: sourceJob.updatedAt,
				},
			];
		});
	if (jobsToCopy.length === 0) return;

	await tx.insertInto("translationJobs").values(jobsToCopy).execute();
	const proofs = await tx
		.selectFrom("pageLocaleTranslationProofs")
		.select(["locale", "translationProofStatus"])
		.where("pageId", "=", sourcePageId)
		.where(
			"locale",
			"in",
			jobsToCopy.map((job) => job.locale),
		)
		.execute();
	if (proofs.length === 0) return;
	await tx
		.insertInto("pageLocaleTranslationProofs")
		.values(proofs.map((proof) => ({ ...proof, pageId: targetPageId })))
		.onConflict((conflict) =>
			conflict.columns(["pageId", "locale"]).doNothing(),
		)
		.execute();
}

export async function migrateSegmentContributions(
	sourcePageId: number,
	targetPageId: number,
): Promise<number> {
	return db.transaction().execute(async (tx) => {
		const [sourceSegments, targetSegments] = await Promise.all([
			fetchSourceSegmentsWithContributions(tx, sourcePageId),
			fetchTargetSegmentsWithoutContributions(tx, targetPageId),
		]);
		const moves = matchContributionMoves(sourceSegments, targetSegments);
		await moveContributionRows(tx, moves);
		await copyCompletedTranslationState(tx, sourcePageId, targetPageId);
		return moves.length;
	});
}

export async function assertNoBodyContributions(pageId: number): Promise<void> {
	const remaining = await db
		.transaction()
		.execute((tx) => fetchSourceSegmentsWithContributions(tx, pageId));
	if (remaining.length > 0) {
		throw new Error(
			`Cannot replace split source page ${pageId}: ${remaining.length} body segments still have translations or glosses`,
		);
	}
}
