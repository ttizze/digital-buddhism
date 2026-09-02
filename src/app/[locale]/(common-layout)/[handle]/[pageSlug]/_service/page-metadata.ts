import { BASE_URL } from "@/app/_constants/base-url";
import { TIPITAKA_ROOT_SLUG } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import type { PageDetail } from "@/app/[locale]/types";
import { buildAlternateLocales } from "../_domain/build-alternate-locales";

export function buildPageMetadata({
	pageDetail,
	description,
	completedTranslationLocales,
	locale,
}: {
	pageDetail: Pick<PageDetail, "slug" | "title">;
	description: string;
	completedTranslationLocales: string[];
	locale: string;
}) {
	const ogImageUrl = `${BASE_URL}/api/og?locale=${locale}&slug=${pageDetail.slug}`;
	const canonicalUrl = `${BASE_URL}/${locale}/${TIPITAKA_ROOT_SLUG}/${pageDetail.slug}`;

	return {
		title: pageDetail.title,
		description,
		openGraph: {
			type: "article" as const,
			title: pageDetail.title,
			description,
			images: [{ url: ogImageUrl, width: 1200, height: 630 }],
		},
		twitter: {
			card: "summary_large_image" as const,
			title: pageDetail.title,
			description,
			images: [ogImageUrl],
		},
		canonicalUrl,
		alternateLocales:
			completedTranslationLocales.length > 0
				? buildAlternateLocales({
						page: pageDetail,
						translatedLocales: completedTranslationLocales,
					})
				: undefined,
	};
}
