"use client";

import { ListTree, LoaderCircle } from "lucide-react";
import useSWR from "swr";
import { TIPITAKA_SYSTEM_USER_HANDLE } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForTree } from "@/app/[locale]/types";
import { getPageTreeData } from "@/routes/$locale/-page-tree-data";
import type { PageTreeNode } from "../../_db/queries";
import {
	CollapsibleTreeList,
	type CollapsibleTreeNode,
} from "./collapsible-tree-list";
import { IconPopoverTrigger } from "./icon-popover-trigger";

export function PageLink({
	node,
	locale,
}: {
	node: PageForTree;
	locale: string;
}) {
	return (
		<a
			className="hover:underline"
			href={`/${locale}/${TIPITAKA_SYSTEM_USER_HANDLE}/${node.slug}`}
		>
			<SegmentElement
				className="line-clamp-1 break-all overflow-wrap-anywhere"
				interactive={false}
				segment={{
					id: node.titleSegmentId,
					pageId: node.id,
					number: 0,
					text: node.titleText,
					translationText: node.titleTranslationText,
				}}
				tagName="span"
			/>
		</a>
	);
}

export function toCollapsibleTreeNodes(
	nodes: PageTreeNode[],
	locale: string,
): CollapsibleTreeNode[] {
	return nodes.map((node) => ({
		id: node.id,
		label: <PageLink locale={locale} node={node} />,
		children: toCollapsibleTreeNodes(node.children, locale),
	}));
}

function PageTreeContent({
	rootNode,
	currentPageId,
	locale,
}: {
	rootNode: PageForTree;
	currentPageId: number;
	locale: string;
}) {
	const { data, error, isLoading } = useSWR(
		["page-tree", rootNode.id, locale],
		() =>
			getPageTreeData({
				data: { locale, rootPageId: rootNode.id },
			}),
		{ revalidateOnFocus: false },
	);

	return (
		<nav aria-label="Page tree">
			<div className="mb-2 text-sm font-medium">
				<PageLink locale={locale} node={rootNode} />
			</div>
			{isLoading ? (
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<LoaderCircle className="size-4 animate-spin" />
					Loading page tree…
				</p>
			) : null}
			{error ? (
				<p className="text-sm text-destructive">Page tree unavailable.</p>
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
	return (
		<IconPopoverTrigger
			align="start"
			icon={<ListTree className="size-5" />}
			title="page tree"
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
