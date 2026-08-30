import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { readPageAnnotations } from "@/app/[locale]/_infrastructure/tipitaka-read-model/reader.server";

const pageAnnotationsInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	pageSlug: z.string().min(1),
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
