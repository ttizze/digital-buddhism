import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { readPageContentData } from "@/app/[locale]/_infrastructure/tipitaka-read-model/reader.server";

const pageDetailInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	pageSlug: z.string().min(1),
});

export const getPageDetailData = createServerFn({ method: "GET" })
	.validator(pageDetailInput)
	.handler(async ({ data }) => {
		setResponseHeaders(new Headers(PUBLIC_PAGE_CACHE_HEADERS));

		return readPageContentData(data.pageSlug, data.locale);
	});
