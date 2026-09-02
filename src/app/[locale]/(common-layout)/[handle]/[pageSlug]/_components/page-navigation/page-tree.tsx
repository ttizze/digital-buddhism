import { ListTree, LoaderCircle } from "lucide-react";
import useSWR from "swr";
import { useTranslations } from "use-intl";
import type { PageForTree } from "@/app/[locale]/types";
import { getPageTreeData } from "@/routes/$locale/-page-tree-data";
import { CollapsibleTreeList } from "./collapsible-tree-list";
import { IconPopoverTrigger } from "./icon-popover-trigger";
import { PageTreeLink } from "./page-tree-link";
import { toCollapsibleTreeNodes } from "./page-tree-nodes";

function PageTreeContent({
	rootNode,
	currentPageId,
	locale,
}: {
	rootNode: PageForTree;
	currentPageId: number;
	locale: string;
}) {
	const t = useTranslations("PageNavigation");
	const { data, error, isLoading } = useSWR(
		["page-tree", rootNode.id, locale],
		() =>
			getPageTreeData({
				data: { locale, rootPageId: rootNode.id },
			}),
		{ revalidateOnFocus: false },
	);

	return (
		<nav aria-label={t("pageTreeTitle")}>
			<div className="mb-2 text-sm font-medium">
				<PageTreeLink locale={locale} node={rootNode} />
			</div>
			{isLoading ? (
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<LoaderCircle className="size-4 animate-spin" />
					{t("loading")}
				</p>
			) : null}
			{error ? (
				<p className="text-sm text-destructive">{t("unavailable")}</p>
			) : null}
			{data ? (
				<CollapsibleTreeList
					activeId={currentPageId}
					nodes={toCollapsibleTreeNodes(data, locale)}
				/>
			) : null}
		</nav>
	);
}

export function PageTree({
	rootNode,
	currentPageId,
	locale,
}: {
	rootNode: PageForTree;
	currentPageId: number;
	locale: string;
}) {
	const t = useTranslations("PageNavigation");
	return (
		<IconPopoverTrigger
			align="start"
			icon={<ListTree className="size-5" />}
			title={t("pageTreeTitle")}
		>
			{() => (
				<PageTreeContent
					currentPageId={currentPageId}
					locale={locale}
					rootNode={rootNode}
				/>
			)}
		</IconPopoverTrigger>
	);
}
