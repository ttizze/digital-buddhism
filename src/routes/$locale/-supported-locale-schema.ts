import * as v from "valibot";
import { supportedLocaleOptions } from "@/app/_constants/locale";

const supportedLocales = new Set(
	supportedLocaleOptions.map((option) => option.code),
);

export const supportedLocaleSchema = v.pipe(
	v.string(),
	v.check((locale) => supportedLocales.has(locale), "対応していないlocaleです"),
);
