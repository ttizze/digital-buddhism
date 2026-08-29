import { ClientOnly, createFileRoute, notFound } from "@tanstack/react-router";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls.client";
import {
	collectAnnotationTypes,
	PageContent,
} from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/page-content";
import { buildPageMetadata } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/page-metadata";
import { getPageDetailData } from "./$locale/-page-detail-data";

export const Route = createFileRoute("/$locale/_common/$handle_/$pageSlug")({
	loader: async ({ params }) => {
		const data = await getPageDetailData({ data: params });
		if (!data) throw notFound();
		return data;
	},
	head: ({ loaderData }) => {
		if (!loaderData) return {};

		const metadata = buildPageMetadata({
			completedTranslationLocales: loaderData.completedTranslationLocales,
			description: loaderData.description,
			pageDetail: loaderData.pageDetail,
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
				...(metadata.isDraft
					? [{ name: "robots", content: "noindex, nofollow" }]
					: []),
			],
			links: [
				{ rel: "canonical", href: metadata.canonicalUrl },
				...Object.entries(metadata.alternateLocales ?? {}).map(
					([hrefLang, href]) => ({ rel: "alternate", hrefLang, href }),
				),
			],
		};
	},
	component: PageDetailRoute,
});

function PageDetailRoute() {
	const { locale } = Route.useParams();
	const data = Route.useLoaderData();
	const annotationTypes = collectAnnotationTypes(data.pageDetail.segments);

	return (
		<PageContent
			childPages={data.childPages}
			description={data.description}
			floatingControls={
				<ClientOnly fallback={null}>
					<FloatingControls
						annotationTypes={annotationTypes}
						sourceLocale={data.pageDetail.sourceLocale}
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
