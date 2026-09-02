import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import * as v from "valibot";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { mdastToMarkdown } from "@/app/[locale]/_domain/mdast-to-markdown";
import { readPageContentData } from "@/app/[locale]/_infrastructure/tipitaka-read-model/reader.server";
import { buildPageContentView } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_domain/page-content-view";
import { supportedLocaleSchema } from "./-supported-locale-schema";

const pageDetailInput = v.object({
	locale: supportedLocaleSchema,
	pageSlug: v.pipe(v.string(), v.minLength(1)),
});

export const getPageDetailData = createServerFn({ method: "GET" })
	.validator(pageDetailInput)
	.handler(async ({ data }) => {
		setPublicPageHeaders();
		const page = await readPageContentData(data.pageSlug, data.locale);
		return page ? buildPageContentView(page) : null;
	});

export const getPageMarkdownData = createServerFn({ method: "GET" })
	.validator(pageDetailInput)
	.handler(async ({ data }) => {
		setPublicPageHeaders();
		const page = await readPageContentData(data.pageSlug, data.locale);
		return page ? mdastToMarkdown(page.pageDetail.mdastJson) : null;
	});

function setPublicPageHeaders(): void {
	setResponseHeaders(new Headers(PUBLIC_PAGE_CACHE_HEADERS));
}
