export const PUBLIC_PAGE_CACHE_HEADERS = {
	"Cache-Control":
		"public, max-age=60, s-maxage=600, stale-while-revalidate=86400",
	"CDN-Cache-Control": "max-age=600, stale-while-revalidate=86400",
} as const;
