import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { TreeList } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/tree-list";
import type { TipitakaPageTreeNode } from "./domain/extract-tipitaka-page-tree";

type TipitakaPageListProps = {
	locale: string;
	pages: readonly TipitakaPageTreeNode[];
};

const initiallyVisibleNodeSlug =
	"tipitaka-01-tipitaka-mula-01-sutta-pitaka-01-digha-nikaya";

export function TipitakaPageList({ locale, pages }: TipitakaPageListProps) {
	const initiallyOpenIds = findInitiallyOpenIds(pages);

	return (
		<section aria-labelledby="tipitaka-title" className="flex flex-col gap-4">
			<h1 className="text-2xl font-semibold" id="tipitaka-title">
				Tipiṭaka
			</h1>
			{pages.length > 0 ? (
				<nav aria-label="Tipiṭaka" className="tipitaka-tree">
					<TipitakaTreeList
						initiallyOpenIds={initiallyOpenIds}
						locale={locale}
						nodes={pages}
					/>
				</nav>
			) : null}
		</section>
	);
}

function TipitakaTreeList({
	initiallyOpenIds,
	locale,
	nodes,
}: {
	initiallyOpenIds: ReadonlySet<number>;
	locale: string;
	nodes: readonly TipitakaPageTreeNode[];
}) {
	return (
		<TreeList>
			{nodes.map((node) => (
				<TipitakaTreeItem
					initiallyOpenIds={initiallyOpenIds}
					key={node.id}
					locale={locale}
					node={node}
				/>
			))}
		</TreeList>
	);
}

function TipitakaTreeItem({
	initiallyOpenIds,
	locale,
	node,
}: {
	initiallyOpenIds: ReadonlySet<number>;
	locale: string;
	node: TipitakaPageTreeNode;
}) {
	const [isOpen, setIsOpen] = useState(initiallyOpenIds.has(node.id));
	const link = (
		<Link
			className="block rounded-md px-2 py-1 hover:bg-muted"
			params={{ locale, pageSlug: node.slug }}
			to="/$locale/tipitaka/$pageSlug"
		>
			<span
				className={`block break-all overflow-wrap-anywhere seg-src ${node.titleTranslationText === null ? "" : "seg-has-tr"}`}
			>
				{node.titleText}
			</span>
			{node.titleTranslationText === null ? null : (
				<span className="block break-all overflow-wrap-anywhere seg-tr">
					{node.titleTranslationText}
				</span>
			)}
		</Link>
	);

	if (node.children.length === 0) return <li>{link}</li>;

	return (
		<li>
			<details
				className="open:[&>summary>svg]:rotate-90 [&>summary>svg]:transition-transform [&>summary>svg]:duration-200 [&>summary>svg]:ease-in-out"
				onToggle={(event) => setIsOpen(event.currentTarget.open)}
				open={isOpen}
			>
				<summary className="cursor-pointer list-none flex items-center gap-1">
					<ChevronRight aria-hidden="true" className="size-4" />
					<div className="flex-1">{link}</div>
				</summary>
				{isOpen ? (
					<div className="mt-2 ml-2 border-l border-dashed border-border/70 pl-3">
						<TipitakaTreeList
							initiallyOpenIds={initiallyOpenIds}
							locale={locale}
							nodes={node.children}
						/>
					</div>
				) : null}
			</details>
		</li>
	);
}

function findInitiallyOpenIds(
	nodes: readonly TipitakaPageTreeNode[],
): ReadonlySet<number> {
	const ancestorIds = new Set<number>();

	function findTarget(node: TipitakaPageTreeNode): boolean {
		if (node.slug === initiallyVisibleNodeSlug) return true;

		for (const child of node.children) {
			if (findTarget(child)) {
				ancestorIds.add(node.id);
				return true;
			}
		}

		return false;
	}

	for (const node of nodes) {
		if (findTarget(node)) break;
	}

	return ancestorIds;
}
