export const PUBLIC_PAGE_CACHE_HEADERS = {
	"Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=60",
	"CDN-Cache-Control": "max-age=60, stale-while-revalidate=60",
} as const;
