/**
 * Drizzle ORM型定義ヘルパー
 *
 * PrismaからDrizzleへの移行時に、型定義を統一するためのヘルパー
 * InferSelectModel: SELECT結果の型
 * InferInsertModel: INSERT用の型
 */
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { db } from "./index";
import type * as schema from "./schema";

// トランザクションクライアント型（dbから推論）
export type TransactionClient = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

// テーブル型のエクスポート
export type User = InferSelectModel<typeof schema.users>;
export type UserInsert = InferInsertModel<typeof schema.users>;

export type TipitakaPage = InferSelectModel<typeof schema.tipitakaPages>;
export type TipitakaPageInsert = InferInsertModel<typeof schema.tipitakaPages>;

export type Segment = InferSelectModel<typeof schema.segments>;
export type SegmentInsert = InferInsertModel<typeof schema.segments>;

export type SegmentTranslation = InferSelectModel<
	typeof schema.segmentTranslations
>;
export type SegmentTranslationInsert = InferInsertModel<
	typeof schema.segmentTranslations
>;

export type Notification = InferSelectModel<typeof schema.notifications>;
export type NotificationInsert = InferInsertModel<typeof schema.notifications>;

export type TranslationVote = InferSelectModel<typeof schema.translationVotes>;
export type TranslationVoteInsert = InferInsertModel<
	typeof schema.translationVotes
>;

export type TranslationJob = InferSelectModel<typeof schema.translationJobs>;
export type TranslationJobInsert = InferInsertModel<
	typeof schema.translationJobs
>;

export type PageLocaleTranslationProof = InferSelectModel<
	typeof schema.pageLocaleTranslationProofs
>;
export type PageLocaleTranslationProofInsert = InferInsertModel<
	typeof schema.pageLocaleTranslationProofs
>;

export type Account = InferSelectModel<typeof schema.accounts>;
export type AccountInsert = InferInsertModel<typeof schema.accounts>;

export type Session = InferSelectModel<typeof schema.sessions>;
export type SessionInsert = InferInsertModel<typeof schema.sessions>;

export type UserSetting = InferSelectModel<typeof schema.userSettings>;
export type UserSettingInsert = InferInsertModel<typeof schema.userSettings>;

export type GeminiApiKey = InferSelectModel<typeof schema.geminiApiKeys>;
export type GeminiApiKeyInsert = InferInsertModel<typeof schema.geminiApiKeys>;

export type SelectedSegmentTranslation = InferSelectModel<
	typeof schema.selectedSegmentTranslations
>;
export type SelectedSegmentTranslationInsert = InferInsertModel<
	typeof schema.selectedSegmentTranslations
>;

export type SegmentWord = InferSelectModel<typeof schema.segmentWords>;
export type SegmentWordInsert = InferInsertModel<typeof schema.segmentWords>;

export type WordGloss = InferSelectModel<typeof schema.wordGlosses>;
export type WordGlossInsert = InferInsertModel<typeof schema.wordGlosses>;

export type SelectedWordGloss = InferSelectModel<
	typeof schema.selectedWordGlosses
>;
export type SelectedWordGlossInsert = InferInsertModel<
	typeof schema.selectedWordGlosses
>;

export type WordGlossVote = InferSelectModel<typeof schema.wordGlossVotes>;
export type WordGlossVoteInsert = InferInsertModel<
	typeof schema.wordGlossVotes
>;

export type SegmentMetadata = InferSelectModel<typeof schema.segmentMetadata>;
export type SegmentMetadataInsert = InferInsertModel<
	typeof schema.segmentMetadata
>;

export type SegmentMetadataType = InferSelectModel<
	typeof schema.segmentMetadataTypes
>;
export type SegmentMetadataTypeInsert = InferInsertModel<
	typeof schema.segmentMetadataTypes
>;

export type SegmentAnnotationLink = InferSelectModel<
	typeof schema.segmentAnnotationLinks
>;
export type SegmentAnnotationLinkInsert = InferInsertModel<
	typeof schema.segmentAnnotationLinks
>;
export type TipitakaPageAnnotationTarget = InferSelectModel<
	typeof schema.tipitakaPageAnnotationTargets
>;
export type TipitakaPageAnnotationTargetInsert = InferInsertModel<
	typeof schema.tipitakaPageAnnotationTargets
>;

export type ImportRun = InferSelectModel<typeof schema.importRuns>;
export type ImportRunInsert = InferInsertModel<typeof schema.importRuns>;

export type ImportFile = InferSelectModel<typeof schema.importFiles>;
export type ImportFileInsert = InferInsertModel<typeof schema.importFiles>;

export type Verification = InferSelectModel<typeof schema.verifications>;
export type VerificationInsert = InferInsertModel<typeof schema.verifications>;

export type ImportFileStatus =
	(typeof schema.importFileStatus.enumValues)[number];
export type ImportRunStatus =
	(typeof schema.importRunStatus.enumValues)[number];

// Enum型のエクスポート
export type TipitakaTextLevel =
	(typeof schema.tipitakaTextLevel.enumValues)[number];
export type TranslationProofStatus =
	(typeof schema.translationProofStatus.enumValues)[number];
export type TranslationStatus =
	(typeof schema.translationStatus.enumValues)[number];

export type JsonPrimitive = boolean | null | number | string;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };
export type JsonValue = JsonArray | JsonObject | JsonPrimitive;
export type Json = JsonValue;
