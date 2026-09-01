import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { fetchSearchResults } from "@/app/[locale]/(common-layout)/search/_db/queries";
import { CATEGORIES } from "@/app/[locale]/(common-layout)/search/constants";

const searchInput = v.object({
	category: v.picklist(CATEGORIES),
	locale: v.pipe(
		v.string(),
		v.check(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	),
	page: v.pipe(v.number(), v.integer(), v.minValue(1)),
	query: v.string(),
});

export const getSearchData = createServerFn({ method: "GET" })
	.validator(searchInput)
	.handler(async ({ data }) => {
		return fetchSearchResults(data);
	});
