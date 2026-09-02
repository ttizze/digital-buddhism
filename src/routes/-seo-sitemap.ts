import { BASE_URL } from "@/app/_constants/base-url";
import {
	DEFAULT_MESSAGE_LOCALE,
	MESSAGE_LOCALES,
} from "@/app/_constants/message-locales";
import {
	countPublicPages,
	fetchTipitakaPagesWithTranslationsChunk,
} from "@/app/_db/sitemap-queries.server";
import {
	TIPITAKA_ROOT_SLUG,
	TIPITAKA_SOURCE_LOCALE,
} from "@/app/[locale]/_domain/tipitaka-page-visibility";

const CHUNK = 1_000;

const SITEMAP_REVALIDATE = 3600;
const SITEMAP_STALE_WHILE_REVALIDATE = 86400;

export async function getSitemapChunkCount() {
	const total = await countPublicPages();
	return Math.max(1, Math.ceil(total / CHUNK));
}

export async function generateSitemapEntries(id: number) {
	const pages = await fetchTipitakaPagesWithTranslationsChunk({
		limit: CHUNK,
		offset: id * CHUNK,
	});

	const supportedLocales = MESSAGE_LOCALES;
	const defaultLocale = DEFAULT_MESSAGE_LOCALE;

	const staticPaths = id === 0 ? ["/search"] : [];
	const staticRoutes = staticPaths.map((route) => ({
		url: `${BASE_URL}/${defaultLocale}${route}`,
		lastModified: new Date(),
		changeFrequency: "monthly" as const,
		priority: 0.8,
		alternates: {
			languages: Object.fromEntries(
				supportedLocales.map((locale) => [
					locale,
					`${BASE_URL}/${locale}${route}`,
				]),
			),
		},
	}));

	const pageRoutes = pages.map((page) => ({
		url: `${BASE_URL}/${TIPITAKA_SOURCE_LOCALE}/${TIPITAKA_ROOT_SLUG}/${page.slug}`,
		lastModified: page.updatedAt,
		changeFrequency: "daily" as const,
		priority: 0.7,
		alternates: {
			languages: Object.fromEntries(
				[TIPITAKA_SOURCE_LOCALE, ...page.translationLocales].map((locale) => [
					locale,
					`${BASE_URL}/${locale}/${TIPITAKA_ROOT_SLUG}/${page.slug}`,
				]),
			),
		},
	}));

	return [...staticRoutes, ...pageRoutes];
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function serializeSitemap(
	entries: Awaited<ReturnType<typeof generateSitemapEntries>>,
): string {
	const urls = entries
		.map((entry) => {
			const alternates = Object.entries(entry.alternates.languages).map(
				([locale, url]) =>
					`<xhtml:link rel="alternate" hreflang="${escapeXml(locale)}" href="${escapeXml(url)}" />`,
			);
			return [
				"<url>",
				`<loc>${escapeXml(entry.url)}</loc>`,
				...alternates,
				`<lastmod>${entry.lastModified.toISOString()}</lastmod>`,
				`<changefreq>${entry.changeFrequency}</changefreq>`,
				`<priority>${entry.priority}</priority>`,
				"</url>",
			].join("\n");
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export async function generateSitemapResponse(id: number) {
	const entries = await generateSitemapEntries(id);
	return new Response(serializeSitemap(entries), {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": `public, max-age=0, s-maxage=${SITEMAP_REVALIDATE}, stale-while-revalidate=${SITEMAP_STALE_WHILE_REVALIDATE}`,
			"CDN-Cache-Control": `max-age=${SITEMAP_REVALIDATE}, stale-while-revalidate=${SITEMAP_STALE_WHILE_REVALIDATE}`,
		},
	});
}
