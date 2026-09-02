import { ClientOnly, createFileRoute, notFound } from "@tanstack/react-router";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { TIPITAKA_SOURCE_LOCALE } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls";
import { PageContent } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/page-content";
import { parsePageContentBody } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_domain/page-content-view";
import { buildPageMetadata } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/page-metadata";
import { getPageDetailData } from "./$locale/-page-detail-data";

export const Route = createFileRoute("/$locale/_common/tipitaka_/$pageSlug")({
	staleTime: 60_000,
	loader: async ({ params }) => {
		const data = await getPageDetailData({ data: params });
		if (!data) throw notFound();
		return data;
	},
	head: ({ loaderData, params }) => {
		if (!loaderData) return {};

		const metadata = buildPageMetadata({
			completedTranslationLocales: loaderData.completedTranslationLocales,
			description: loaderData.description,
			pageDetail: loaderData.pageDetail,
			locale: params.locale,
		});

		return {
			meta: [
				{ title: metadata.title },
				{ name: "description", content: metadata.description },
				{ property: "og:type", content: metadata.openGraph.type },
				{ property: "og:title", content: metadata.openGraph.title },
				{ property: "og:description", content: metadata.openGraph.description },
				{
					property: "og:image",
					content: metadata.openGraph.images[0]?.url,
				},
				{ name: "twitter:card", content: metadata.twitter.card },
				{ name: "twitter:title", content: metadata.twitter.title },
				{
					name: "twitter:description",
					content: metadata.twitter.description,
				},
				{
					name: "twitter:image",
					content: metadata.twitter.images[0],
				},
			],
			links: [
				{ rel: "canonical", href: metadata.canonicalUrl },
				...Object.entries(metadata.alternateLocales ?? {}).map(
					([hrefLang, href]) => ({ rel: "alternate", hrefLang, href }),
				),
			],
		};
	},
	headers: () => PUBLIC_PAGE_CACHE_HEADERS,
	component: PageDetailRoute,
});

function PageDetailRoute() {
	const { locale } = Route.useParams();
	const data = Route.useLoaderData();
	const body = parsePageContentBody(data.body);

	return (
		<PageContent
			body={body}
			childPages={data.childPages}
			description={data.description}
			floatingControls={
				<ClientOnly fallback={null}>
					<FloatingControls
						annotationTypes={data.annotationTypes}
						sourceLocale={TIPITAKA_SOURCE_LOCALE}
						userLocale={locale}
					/>
				</ClientOnly>
			}
			locale={locale}
			navigationData={data.navigationData}
			pageDetail={data.pageDetail}
		/>
	);
}
