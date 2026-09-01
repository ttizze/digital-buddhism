import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import * as v from "valibot";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { readPageAnnotations } from "@/app/[locale]/_infrastructure/tipitaka-read-model/reader.server";
import { supportedLocaleSchema } from "./-supported-locale-schema";

const pageAnnotationsInput = v.object({
	locale: supportedLocaleSchema,
	pageSlug: v.pipe(v.string(), v.minLength(1)),
});

export const getPageAnnotationsData = createServerFn({ method: "GET" })
	.validator(pageAnnotationsInput)
	.handler(async ({ data }) => {
		setResponseHeaders(new Headers(PUBLIC_PAGE_CACHE_HEADERS));
		const annotations = await readPageAnnotations(data.pageSlug, data.locale);
		if (!annotations)
			throw new Error("Tipitaka annotation read model not found");
		return annotations;
	});
