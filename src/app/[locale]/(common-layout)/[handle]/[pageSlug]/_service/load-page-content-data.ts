import { mdastToText } from "@/app/[locale]/_domain/mdast-to-text";
import type { PageDetail } from "@/app/[locale]/types";
import {
	queryChildPagesTree,
	queryCompletedTranslationLocales,
	queryPageNavigationData,
} from "../_db/queries";

export async function loadPageContentData(
	pageDetail: PageDetail,
	locale: string,
) {
	const [navigationData, childPages, locales, description] = await Promise.all([
		queryPageNavigationData(pageDetail.id, locale),
		queryChildPagesTree(pageDetail.id, locale),
		queryCompletedTranslationLocales(pageDetail.id),
		mdastToText(pageDetail.mdastJson).then((text) => text.slice(0, 200)),
	]);

	return {
		pageDetail,
		navigationData,
		childPages,
		completedTranslationLocales: locales,
		description,
	};
}
