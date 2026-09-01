import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { getHomeMetadata } from "@/app/[locale]/(common-layout)/_components/home/metadata";
import { TipitakaPageList } from "@/app/[locale]/(common-layout)/_components/tipitaka-page-list/tipitaka-page-list";
import { getIndexData } from "./$locale/-index-data";

export const Route = createFileRoute("/$locale/_common/tipitaka")({
	loader: async ({ params }) => {
		const data = await getIndexData({ data: { locale: params.locale } });

		return data;
	},
	head: ({ params }) => {
		const { title, description, alternates } = getHomeMetadata(params.locale);

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
			],
			links: [
				{ rel: "canonical", href: alternates.canonical },
				...Object.entries(alternates.languages).map(([hrefLang, href]) => ({
					rel: "alternate",
					hrefLang,
					href,
				})),
			],
		};
	},
	headers: () => PUBLIC_PAGE_CACHE_HEADERS,
	component: TipitakaIndex,
});

function TipitakaIndex() {
	const { locale } = Route.useParams();
	const data = Route.useLoaderData();

	return <TipitakaPageList locale={locale} pages={data.tipitakaPages} />;
}
