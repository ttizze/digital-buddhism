import type { NavigationData } from "../../_db/queries";
import type { TocItem } from "../../_domain/extract-toc-items";
import { ExportMarkdownButton } from "../export-markdown-button";
import { PageBreadcrumb } from "./page-breadcrumb";
import { PageTree } from "./page-tree";
import { TocTrigger } from "./toc-trigger";

interface PageNavigationProps {
	pageId: number;
	locale: string;
	data: NavigationData | null;
	slug: string;
	title: string;
	tocItems: TocItem[];
}

export function PageNavigation({
	pageId,
	locale,
	data,
	slug,
	title,
	tocItems,
}: PageNavigationProps) {
	return (
		<div className="mb-4 not-prose flex items-start gap-2">
			{data ? (
				<div className="flex min-w-0 items-start gap-2">
					<PageTree
						currentPageId={pageId}
						locale={locale}
						rootNode={data.rootNode}
					/>
					<PageBreadcrumb breadcrumb={data.breadcrumb} locale={locale} />
				</div>
			) : null}
			<div className="ml-auto flex shrink-0 items-center gap-2">
				<ExportMarkdownButton locale={locale} slug={slug} title={title} />
				<TocTrigger items={tocItems} />
			</div>
		</div>
	);
}
