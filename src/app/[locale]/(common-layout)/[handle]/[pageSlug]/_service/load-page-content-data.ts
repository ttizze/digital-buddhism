import { mdastToText } from "@/app/[locale]/_domain/mdast-to-text";
import type { PageDetail } from "@/app/[locale]/types";
import {
	type NavigationData,
	type PageTitleTree,
	queryChildPagesTree,
	queryCompletedTranslationLocales,
	queryPageNavigationData,
} from "../_db/queries";
import {
	type AnnotationType,
	collectAnnotationTypes,
} from "../_domain/collect-annotation-types";
export type PageContentData = {
	pageDetail: PageDetail;
	navigationData: NavigationData | null;
	childPages: PageTitleTree[];
	completedTranslationLocales: string[];
	description: string;
	annotationTypes: AnnotationType[];
};

export async function loadPageContentData(
	pageDetail: PageDetail,
	locale: string,
): Promise<PageContentData> {
	const [navigationData, childPages, locales] = await Promise.all([
		queryPageNavigationData(pageDetail.id, locale),
		queryChildPagesTree(pageDetail.id, locale),
		queryCompletedTranslationLocales(pageDetail.id),
	]);

	return {
		pageDetail,
		navigationData,
		childPages,
		completedTranslationLocales: locales,
		description: mdastToText(pageDetail.mdastJson).slice(0, 200),
		annotationTypes: collectAnnotationTypes(pageDetail.segments),
	};
}
