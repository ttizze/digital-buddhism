import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { queryPageTreeData } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_db/queries";

const pageTreeInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	rootPageId: z.number().int().positive(),
});

export const getPageTreeData = createServerFn({ method: "GET" })
	.validator(pageTreeInput)
	.handler(async ({ data }) => {
		setResponseHeaders(new Headers(PUBLIC_PAGE_CACHE_HEADERS));
		return queryPageTreeData(data.rootPageId, data.locale);
	});
