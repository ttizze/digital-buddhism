import { mdastToText } from "@/app/[locale]/_domain/mdast-to-text";
import type { PageDetail } from "@/app/[locale]/types";
import {
	queryChildPagesTree,
	queryCompletedTranslationLocales,
	queryPageCounts,
	queryPageNavigationData,
	queryPageViewCount,
} from "../_db/queries";

export async function loadPageContentData(
	pageDetail: PageDetail,
	locale: string,
) {
	const [
		pageCounts,
		pageViewCount,
		navigationData,
		childPages,
		locales,
		description,
	] = await Promise.all([
		queryPageCounts(pageDetail.id),
		queryPageViewCount(pageDetail.id),
		queryPageNavigationData(pageDetail.id, locale, pageDetail.isTipitakaPage),
		queryChildPagesTree(pageDetail.id, locale, pageDetail.isTipitakaPage),
		queryCompletedTranslationLocales(pageDetail.id),
		mdastToText(pageDetail.mdastJson).then((text) => text.slice(0, 200)),
	]);

	return {
		pageDetail,
		pageCounts,
		pageViewCount,
		navigationData,
		childPages,
		completedTranslationLocales: locales,
		description,
	};
}
