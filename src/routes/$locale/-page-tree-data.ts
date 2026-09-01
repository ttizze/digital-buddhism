import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import * as v from "valibot";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { readPageTree } from "@/app/[locale]/_infrastructure/tipitaka-read-model/reader.server";

const pageTreeInput = v.object({
	locale: v.pipe(
		v.string(),
		v.check(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	),
	rootPageId: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export const getPageTreeData = createServerFn({ method: "GET" })
	.validator(pageTreeInput)
	.handler(async ({ data }) => {
		setResponseHeaders(new Headers(PUBLIC_PAGE_CACHE_HEADERS));
		const tree = await readPageTree(data.rootPageId, data.locale);
		if (!tree) throw new Error("Tipitaka tree read model not found");
		return tree;
	});
