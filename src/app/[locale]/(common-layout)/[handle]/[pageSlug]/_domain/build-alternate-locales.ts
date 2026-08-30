import { BASE_URL } from "@/app/_constants/base-url";
import {
	TIPITAKA_ROOT_SLUG,
	TIPITAKA_SOURCE_LOCALE,
} from "@/app/[locale]/_domain/tipitaka-page-visibility";

interface BuildAlternateLocalesParams {
	page: { slug: string };
	translatedLocales: string[];
}

export function buildAlternateLocales({
	page,
	translatedLocales,
}: BuildAlternateLocalesParams): Record<string, string> {
	const buildUrl = (locale: string) =>
		`${BASE_URL}/${locale}/${TIPITAKA_ROOT_SLUG}/${page.slug}`;

	const locales = new Set([TIPITAKA_SOURCE_LOCALE, ...translatedLocales]);

	return Object.fromEntries(
		Array.from(locales).map((locale) => [locale, buildUrl(locale)]),
	);
}
