import { createId } from "@paralleldrive/cuid2";
import { db } from "@/db";
import type {
	TranslationProofStatus,
	TranslationStatus,
} from "@/drizzle/types";

const TRANSLATION_CHUNK_LEASE_MS = 15 * 60 * 1000;

export type TranslationChunkClaim =
	| { status: "claimed" }
	| { status: "completed" }
	| { status: "busy"; retryAfterSeconds: number };

export async function getOrCreateAIUser(name: string): Promise<string> {
	const existing = await db
		.selectFrom("users")
		.select("id")
		.where("handle", "=", name)
		.executeTakeFirst();

	if (existing) return existing.id;

	const id = createId();
	const inserted = await db
		.insertInto("users")
		.values({
			id,
			handle: name,
			name: name,
			isAi: true,
			image: "",
			email: `${name}@ai.com`,
		})
		.onConflict((oc) => oc.doNothing())
		.returning("id")
		.executeTakeFirst();
	if (inserted) return inserted.id;

	const concurrentlyInserted = await db
		.selectFrom("users")
		.select("id")
		.where("handle", "=", name)
		.executeTakeFirstOrThrow();
	return concurrentlyInserted.id;
}

export async function markJobFailed(
	translationJobId: number,
	progress?: number,
	errorMessage?: string,
) {
	const updated = await db
		.updateTable("translationJobs")
		.set({
			status: "FAILED" satisfies TranslationStatus,
			...(progress === undefined ? {} : { progress }),
			error: errorMessage ?? "",
		})
		.where("id", "=", translationJobId)
		.returningAll()
		.executeTakeFirst();
	return updated;
}

export async function claimTranslationChunk(params: {
	translationJobId: number;
	chunkIndex: number;
	leaseToken: string;
	nowMs?: number;
}): Promise<TranslationChunkClaim> {
	const nowMs = params.nowMs ?? Date.now();
	const leaseExpiresAt = nowMs + TRANSLATION_CHUNK_LEASE_MS;
	const claimed = await db
		.insertInto("translationChunkRuns")
		.values({
			translationJobId: params.translationJobId,
			chunkIndex: params.chunkIndex,
			leaseToken: params.leaseToken,
			leaseExpiresAt,
			completedAt: null,
		})
		.onConflict((oc) =>
			oc
				.columns(["translationJobId", "chunkIndex"])
				.doUpdateSet({
					leaseToken: params.leaseToken,
					leaseExpiresAt,
				})
				.where("completedAt", "is", null)
				.where("leaseExpiresAt", "<=", nowMs),
		)
		.returning("leaseToken")
		.executeTakeFirst();

	if (claimed?.leaseToken === params.leaseToken) return { status: "claimed" };

	const existing = await db
		.selectFrom("translationChunkRuns")
		.select(["completedAt", "leaseExpiresAt"])
		.where("translationJobId", "=", params.translationJobId)
		.where("chunkIndex", "=", params.chunkIndex)
		.executeTakeFirst();
	if (existing?.completedAt !== null && existing?.completedAt !== undefined) {
		return { status: "completed" };
	}

	return {
		status: "busy",
		retryAfterSeconds: Math.max(
			1,
			Math.ceil(((existing?.leaseExpiresAt ?? nowMs) - nowMs) / 1000) + 1,
		),
	};
}

export async function completeTranslationChunk(params: {
	translationJobId: number;
	chunkIndex: number;
	leaseToken: string;
	nowMs?: number;
}): Promise<void> {
	const nowMs = params.nowMs ?? Date.now();
	await db
		.updateTable("translationChunkRuns")
		.set({ completedAt: nowMs, leaseExpiresAt: nowMs })
		.where("translationJobId", "=", params.translationJobId)
		.where("chunkIndex", "=", params.chunkIndex)
		.where("leaseToken", "=", params.leaseToken)
		.where("completedAt", "is", null)
		.execute();
}

export async function releaseTranslationChunk(params: {
	translationJobId: number;
	chunkIndex: number;
	leaseToken: string;
}): Promise<void> {
	await db
		.deleteFrom("translationChunkRuns")
		.where("translationJobId", "=", params.translationJobId)
		.where("chunkIndex", "=", params.chunkIndex)
		.where("leaseToken", "=", params.leaseToken)
		.where("completedAt", "is", null)
		.execute();
}

export async function ensurePageLocaleTranslationProof(
	pageId: number,
	locale: string,
) {
	await db
		.insertInto("pageLocaleTranslationProofs")
		.values({
			pageId,
			locale,
			translationProofStatus: "MACHINE_DRAFT" satisfies TranslationProofStatus,
		})
		.onConflict((oc) => oc.columns(["pageId", "locale"]).doNothing())
		.execute();
}

export async function setTranslationProgress(
	translationJobId: number,
	translatedSegments: number,
	totalSegments: number,
) {
	const progress =
		totalSegments === 0
			? 100
			: Math.min(100, Math.floor((translatedSegments * 100) / totalSegments));
	const status = progress === 100 ? "COMPLETED" : "IN_PROGRESS";

	await db
		.updateTable("translationJobs")
		.set({
			status: status satisfies TranslationStatus,
			progress,
			error: "",
		})
		.where("id", "=", translationJobId)
		.where("status", "not in", ["COMPLETED", "FAILED"])
		.execute();

	return db
		.selectFrom("translationJobs")
		.selectAll()
		.where("id", "=", translationJobId)
		.executeTakeFirst();
}

type SegmentTranslationData = {
	locale: string;
	text: string;
	userId: string;
	segmentId: number;
};

export async function insertSegmentTranslations(
	data: readonly SegmentTranslationData[],
) {
	await db.insertInto("segmentTranslations").values(data).execute();
}

export async function getTranslatedSegmentIds(
	segmentIds: readonly number[],
	locale: string,
	userId: string,
): Promise<Set<number>> {
	if (segmentIds.length === 0) return new Set();

	const rows = await db
		.selectFrom("segmentTranslations")
		.select("segmentId")
		.distinct()
		.where("segmentId", "in", segmentIds)
		.where("locale", "=", locale)
		.where("userId", "=", userId)
		.execute();

	return new Set(rows.map((row) => row.segmentId));
}
