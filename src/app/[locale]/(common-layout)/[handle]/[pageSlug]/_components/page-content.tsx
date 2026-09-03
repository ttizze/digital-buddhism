import type { ReactNode } from "react";
import { Hydrate } from "@tanstack/react-start";
import { idle } from "@tanstack/react-start/hydration";
import { BASE_URL } from "@/app/_constants/base-url";
import { TIPITAKA_ROOT_SLUG } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import type { NavigationData, PageTitleTree } from "../_db/queries";
import type {
	PageContentBody,
	PageDetailView,
} from "../_domain/page-content-view";
import { ChildPages } from "./child-pages";
import { ContentWithTranslations } from "./content-with-translations";

const contentHydrationStrategy = idle();

export function PageContent({
	body,
	pageDetail,
	locale,
	navigationData,
	childPages,
	description,
	floatingControls,
}: {
	body: PageContentBody;
	pageDetail: PageDetailView;
	locale: string;
	navigationData: NavigationData | null;
	childPages: PageTitleTree[];
	description: string;
	floatingControls: ReactNode;
}) {
	const articleUrl = `${BASE_URL}/${locale}/${TIPITAKA_ROOT_SLUG}/${pageDetail.slug}`;
	const authorUrl = `${BASE_URL}/${locale}/${TIPITAKA_ROOT_SLUG}`;

	return (
		<article className="w-full prose dark:prose-invert prose-a:underline lg:prose-lg mx-auto mb-20">
			<ArticleJsonLd
				authorName="Tipitaka"
				authorUrl={authorUrl}
				dateModified={pageDetail.updatedAt.toISOString()}
				datePublished={pageDetail.createdAt.toISOString()}
				description={description}
				headline={pageDetail.title}
				image={`${BASE_URL}/api/og?locale=${locale}&slug=${pageDetail.slug}`}
				inLanguage={locale}
				url={articleUrl}
			/>
			<BreadcrumbJsonLd
				items={[
					{ name: "Home", url: `${BASE_URL}/${locale}` },
					{ name: "Tipitaka", url: authorUrl },
					{ name: pageDetail.title, url: articleUrl },
				]}
			/>
			<Hydrate when={contentHydrationStrategy}>
				<ContentWithTranslations
					body={body}
					locale={locale}
					navigationData={navigationData}
					pageDetail={pageDetail}
				/>
			</Hydrate>
			<ChildPages locale={locale} pages={childPages} />

			{floatingControls}
		</article>
	);
}
