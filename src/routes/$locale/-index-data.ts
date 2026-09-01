import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import * as v from "valibot";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { readHomeData } from "@/app/[locale]/_infrastructure/tipitaka-read-model/reader.server";
import type { TipitakaPageTreeNode } from "@/app/[locale]/(common-layout)/_components/tipitaka-page-list/domain/extract-tipitaka-page-tree";

const indexInput = v.object({
	locale: v.pipe(
		v.string(),
		v.check(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	),
});
export type HomeData = {
	tipitakaPages: TipitakaPageTreeNode[];
};

export const getIndexData = createServerFn({ method: "GET" })
	.validator(indexInput)
	.handler(async ({ data }): Promise<HomeData> => {
		setResponseHeaders(new Headers(PUBLIC_PAGE_CACHE_HEADERS));
		const home = await readHomeData(data.locale);
		if (!home) throw new Error("Tipitaka home read model not found");
		return { tipitakaPages: home.tipitakaPages };
	});
