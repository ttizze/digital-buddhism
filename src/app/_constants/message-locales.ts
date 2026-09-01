/**
 * UI翻訳（messages/*.json）が存在するロケール。
 * messages/ にファイルを追加・削除したらここだけを更新する
 * （$locale.tsx の messages マップはこの型で網羅チェックされる）。
 */
export const MESSAGE_LOCALES = ["en", "es", "ja", "ko", "zh"] as const;
export type MessageLocale = (typeof MESSAGE_LOCALES)[number];
export const DEFAULT_MESSAGE_LOCALE: MessageLocale = "en";
