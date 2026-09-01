/**
 * Kysely型ヘルパー
 * kysely-codegenの出力から実際に使う行型だけを公開する。
 * 追加が必要になったら `Selectable<DB["table"]>` をここで定義すること。
 */
import type { Selectable } from "kysely";
import type { DB } from "./types";

export type User = Selectable<DB["users"]>;
export type Segment = Selectable<DB["segments"]>;
export type TranslationJob = Selectable<DB["translationJobs"]>;

/** 公開可能なユーザー情報（センシティブ情報を除外） */
export type SanitizedUser = Omit<
	User,
	"email" | "provider" | "emailVerified" | "id"
>;
