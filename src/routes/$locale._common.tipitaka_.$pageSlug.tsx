import {
	Await,
	ClientOnly,
	createFileRoute,
	notFound,
} from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { TIPITAKA_SOURCE_LOCALE } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls";
import { PageContent } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/page-content";
import pageContentCss from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/page-content.css?url";
import { TranslationFormOnClick } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-form-on-click";
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
			completedTranslationLocales:
				loaderData.metadata.completedTranslationLocales,
			description: loaderData.metadata.description,
			pageDetail: loaderData.metadata.pageDetail,
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
				{ rel: "stylesheet", href: pageContentCss },
				{ rel: "canonical", href: metadata.canonicalUrl },
				...Object.entries(metadata.alternateLocales ?? {}).map(
					([hrefLang, href]) => ({ rel: "alternate", hrefLang, href }),
				),
			],
		};
	},
	headers: () => PUBLIC_PAGE_CACHE_HEADERS,
	pendingComponent: PageDetailSkeleton,
	component: PageDetailRoute,
});

function PageDetailRoute() {
	const { locale } = Route.useParams();
	const { content } = Route.useLoaderData();

	return (
		<Await promise={content} fallback={<PageDetailSkeleton />}>
			{(data) => (
				<>
					<PageContent
						body={parsePageContentBody(data.body)}
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
					<ClientOnly fallback={null}>
						<TranslationFormOnClick />
					</ClientOnly>
				</>
			)}
		</Await>
	);
}

function PageDetailSkeleton() {
	return (
		<div
			aria-busy="true"
			className="mx-auto mb-20 w-full max-w-prose space-y-8"
		>
			<div aria-hidden="true" className="space-y-8">
				<Skeleton className="h-5 w-48 max-w-full" />
				<Skeleton className="h-10 w-3/4" />
				{[0, 1, 2].map((paragraph) => (
					<div key={paragraph} className="space-y-3">
						<Skeleton className="h-5 w-full" />
						<Skeleton className="h-5 w-full" />
						<Skeleton className="h-5 w-5/6" />
						<Skeleton className="h-5 w-2/3" />
					</div>
				))}
			</div>
		</div>
	);
}
