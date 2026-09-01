import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import * as v from "valibot";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { readPageContentData } from "@/app/[locale]/_infrastructure/tipitaka-read-model/reader.server";
import { supportedLocaleSchema } from "./-supported-locale-schema";

const pageDetailInput = v.object({
	locale: supportedLocaleSchema,
	pageSlug: v.pipe(v.string(), v.minLength(1)),
});

export const getPageDetailData = createServerFn({ method: "GET" })
	.validator(pageDetailInput)
	.handler(async ({ data }) => {
		setResponseHeaders(new Headers(PUBLIC_PAGE_CACHE_HEADERS));

		return readPageContentData(data.pageSlug, data.locale);
	});
