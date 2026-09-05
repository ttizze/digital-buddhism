import { Await, createFileRoute } from "@tanstack/react-router";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";
import { getHomeMetadata } from "@/app/[locale]/(common-layout)/_components/home/metadata";
import { TipitakaPageList } from "@/app/[locale]/(common-layout)/_components/tipitaka-page-list/tipitaka-page-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getIndexData } from "./$locale/-index-data";

export const Route = createFileRoute("/$locale/_common/tipitaka")({
	staleTime: 60_000,
	loader: ({ params }) => ({
		home: getIndexData({ data: { locale: params.locale } }),
	}),
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
	const { home } = Route.useLoaderData();

	return (
		<Await
			fallback={
				<div aria-busy="true" className="flex flex-col gap-4">
					<TipitakaPageList locale={locale} pages={[]} />
					<div aria-hidden="true" className="space-y-3">
						<Skeleton className="h-12 w-64 max-w-full" />
						<div className="ml-6 space-y-3 border-l border-dashed border-border/70 pl-3">
							<Skeleton className="h-12 w-56 max-w-full" />
							<Skeleton className="ml-6 h-12 w-48 max-w-[calc(100%-1.5rem)]" />
							<Skeleton className="ml-6 h-12 w-52 max-w-[calc(100%-1.5rem)]" />
							<Skeleton className="h-12 w-56 max-w-full" />
						</div>
						<Skeleton className="h-12 w-60 max-w-full" />
						<Skeleton className="h-12 w-52 max-w-full" />
					</div>
				</div>
			}
			promise={home}
		>
			{(data) => (
				<TipitakaPageList locale={locale} pages={data.tipitakaPages} />
			)}
		</Await>
	);
}
