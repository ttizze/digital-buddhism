/**
 * Drizzle スキーマ由来の enum / JSON 型定義
 *
 * テーブル行の型は kysely-codegen の `@/db/types` / `@/db/types.helpers` を使うこと。
 * ここにはスキーマの enum 値から導出する型と、JSON カラム用の型だけを置く。
 */
import type * as schema from "./schema";

export type ImportFileStatus =
	(typeof schema.importFileStatus.enumValues)[number];
export type ImportRunStatus =
	(typeof schema.importRunStatus.enumValues)[number];

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
