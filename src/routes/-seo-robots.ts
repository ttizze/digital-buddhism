import { BASE_URL } from "@/app/_constants/base-url";
import { getSitemapChunkCount } from "./-seo-sitemap";

const ROBOTS_REVALIDATE = 36000;
const ROBOTS_STALE_WHILE_REVALIDATE = 86400;

export async function generateRobotsResponse() {
	const chunks = await getSitemapChunkCount();
	const sitemaps = Array.from(
		{ length: chunks },
		(_, id) => `${BASE_URL}/sitemap/sitemap/${id}.xml`,
	);

	return new Response(
		[
			"User-Agent: *",
			"Allow: /",
			"",
			...sitemaps.map((url) => `Sitemap: ${url}`),
			"",
		].join("\n"),
		{
			headers: {
				"Cache-Control": `public, max-age=0, s-maxage=${ROBOTS_REVALIDATE}, stale-while-revalidate=${ROBOTS_STALE_WHILE_REVALIDATE}`,
				"CDN-Cache-Control": `max-age=${ROBOTS_REVALIDATE}, stale-while-revalidate=${ROBOTS_STALE_WHILE_REVALIDATE}`,
				"Content-Type": "text/plain",
			},
		},
	);
}
