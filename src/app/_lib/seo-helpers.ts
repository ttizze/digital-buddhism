import { BASE_URL } from "@/app/_constants/base-url";
import {
	DEFAULT_MESSAGE_LOCALE,
	MESSAGE_LOCALES,
} from "@/app/_constants/message-locales";

type AlternatesConfig = {
	canonical: string;
	languages: Record<string, string>;
};

/**
 * Generate alternates config with canonical URL and hreflang tags including x-default
 */
export function buildAlternates(
	locale: string,
	path: string,
): AlternatesConfig {
	const normalizedPath = path === "/" ? "" : path;

	return {
		canonical: `${BASE_URL}/${locale}${normalizedPath}`,
		languages: {
			"x-default": `${BASE_URL}/${DEFAULT_MESSAGE_LOCALE}${normalizedPath}`,
			...Object.fromEntries(
				MESSAGE_LOCALES.map((loc) => [
					loc,
					`${BASE_URL}/${loc}${normalizedPath}`,
				]),
			),
		},
	};
}

type StaticHeadConfig = {
	title: string;
	description: string;
	robots: { index: boolean; follow: boolean };
};

/** 静的ページ用の head() 定義（title / description / robots）を組み立てる */
export function buildStaticHead({
	title,
	description,
	robots,
}: StaticHeadConfig) {
	return {
		meta: [
			{ title },
			{ name: "description", content: description },
			{
				name: "robots",
				content: `${robots.index ? "index" : "noindex"}, ${robots.follow ? "follow" : "nofollow"}`,
			},
		],
	};
}
