import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { queryPageDetail } from "@/app/[locale]/_db/queries";
import { TIPITAKA_SYSTEM_USER_HANDLE } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { loadPageContentData } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/load-page-content-data";

const pageDetailInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	handle: z.string().min(1),
	pageSlug: z.string().min(1),
});

export const getPageDetailData = createServerFn({ method: "GET" })
	.validator(pageDetailInput)
	.handler(async ({ data }) => {
		setResponseHeader(
			"Cache-Control",
			"public, max-age=60, stale-while-revalidate=300",
		);

		if (data.handle !== TIPITAKA_SYSTEM_USER_HANDLE) return null;
		const pageDetail = await queryPageDetail(data.pageSlug, data.locale);
		if (!pageDetail) return null;

		if (!pageDetail.segments.some((segment) => segment.number === 0)) {
			return null;
		}

		return loadPageContentData(pageDetail, data.locale);
	});
