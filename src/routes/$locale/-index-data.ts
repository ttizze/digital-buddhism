import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { fetchTipitakaPageTree } from "@/app/[locale]/(common-layout)/_components/tipitaka-page-list/db/queries";
import type { TipitakaPageTreeNode } from "@/app/[locale]/(common-layout)/_components/tipitaka-page-list/domain/extract-tipitaka-page-tree";

const indexInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
});
export type HomeData = {
	tipitakaPages: TipitakaPageTreeNode[];
};

export const getIndexData = createServerFn({ method: "GET" })
	.validator(indexInput)
	.handler(async ({ data }): Promise<HomeData> => {
		const tipitakaPages = await fetchTipitakaPageTree(data.locale);

		return { tipitakaPages };
	});
