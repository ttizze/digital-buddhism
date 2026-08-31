/**
 * Kysely型ヘルパー
 * kysely-codegenの出力をSelectable/Insertable/Updateableに変換するユーティリティ
 */
import type { Insertable, Selectable, Updateable } from "kysely";
import type { DB } from "./types";

// ============================================
// テーブル別型定義（公式スタイル）
// ============================================

// User
export type User = Selectable<DB["users"]>;
export type NewUser = Insertable<DB["users"]>;
export type UserUpdate = Updateable<DB["users"]>;

// TipitakaPage
export type TipitakaPage = Selectable<DB["tipitakaPages"]>;
export type NewTipitakaPage = Insertable<DB["tipitakaPages"]>;
export type TipitakaPageUpdate = Updateable<DB["tipitakaPages"]>;

// Segment
export type Segment = Selectable<DB["segments"]>;
export type NewSegment = Insertable<DB["segments"]>;
export type SegmentUpdate = Updateable<DB["segments"]>;

// SegmentTranslation
export type SegmentTranslation = Selectable<DB["segmentTranslations"]>;
export type NewSegmentTranslation = Insertable<DB["segmentTranslations"]>;
export type SegmentTranslationUpdate = Updateable<DB["segmentTranslations"]>;

// SelectedSegmentTranslation
export type SelectedSegmentTranslation = Selectable<
	DB["selectedSegmentTranslations"]
>;
export type NewSelectedSegmentTranslation = Insertable<
	DB["selectedSegmentTranslations"]
>;

// SegmentGlossSet
export type SegmentGlossSet = Selectable<DB["segmentGlossSets"]>;
export type NewSegmentGlossSet = Insertable<DB["segmentGlossSets"]>;
export type SegmentGlossSetUpdate = Updateable<DB["segmentGlossSets"]>;

// SegmentGlossUnit
export type SegmentGlossUnit = Selectable<DB["segmentGlossUnits"]>;
export type NewSegmentGlossUnit = Insertable<DB["segmentGlossUnits"]>;
export type SegmentGlossUnitUpdate = Updateable<DB["segmentGlossUnits"]>;

// SelectedSegmentGlossSet
export type SelectedSegmentGlossSet = Selectable<
	DB["selectedSegmentGlossSets"]
>;
export type NewSelectedSegmentGlossSet = Insertable<
	DB["selectedSegmentGlossSets"]
>;

// SegmentGlossUnitVote
export type SegmentGlossUnitVote = Selectable<DB["segmentGlossUnitVotes"]>;
export type NewSegmentGlossUnitVote = Insertable<DB["segmentGlossUnitVotes"]>;
export type SegmentGlossUnitVoteUpdate = Updateable<
	DB["segmentGlossUnitVotes"]
>;

// TranslationVote
export type TranslationVote = Selectable<DB["translationVotes"]>;
export type NewTranslationVote = Insertable<DB["translationVotes"]>;
export type TranslationVoteUpdate = Updateable<DB["translationVotes"]>;

// TranslationJob
export type TranslationJob = Selectable<DB["translationJobs"]>;
export type NewTranslationJob = Insertable<DB["translationJobs"]>;
export type TranslationJobUpdate = Updateable<DB["translationJobs"]>;

// Notification
export type Notification = Selectable<DB["notifications"]>;
export type NewNotification = Insertable<DB["notifications"]>;
export type NotificationUpdate = Updateable<DB["notifications"]>;

// Session
export type Session = Selectable<DB["sessions"]>;
export type NewSession = Insertable<DB["sessions"]>;
export type SessionUpdate = Updateable<DB["sessions"]>;

// Account
export type Account = Selectable<DB["accounts"]>;
export type NewAccount = Insertable<DB["accounts"]>;
export type AccountUpdate = Updateable<DB["accounts"]>;

// SegmentMetadata
export type SegmentMetadata = Selectable<DB["segmentMetadata"]>;
export type NewSegmentMetadata = Insertable<DB["segmentMetadata"]>;
export type SegmentMetadataUpdate = Updateable<DB["segmentMetadata"]>;

// SegmentAnnotationLink
export type SegmentAnnotationLink = Selectable<DB["segmentAnnotationLinks"]>;
export type NewSegmentAnnotationLink = Insertable<DB["segmentAnnotationLinks"]>;
export type SegmentAnnotationLinkUpdate = Updateable<
	DB["segmentAnnotationLinks"]
>;

// ============================================
// 派生型（ビジネスロジック用）
// ============================================

/** 公開可能なユーザー情報（センシティブ情報を除外） */
export type SanitizedUser = Omit<
	User,
	"email" | "provider" | "emailVerified" | "id"
>;
