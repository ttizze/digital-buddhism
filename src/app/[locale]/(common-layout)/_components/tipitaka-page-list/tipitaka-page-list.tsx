import { Link } from "@tanstack/react-router";
import type { TipitakaPageTreeNode } from "./domain/extract-tipitaka-page-tree";

type TipitakaPageListProps = {
	locale: string;
	pages: readonly TipitakaPageTreeNode[];
};

export function TipitakaPageList({ locale, pages }: TipitakaPageListProps) {
	return (
		<section aria-labelledby="tipitaka-title" className="flex flex-col gap-4">
			<h1 className="text-2xl font-semibold" id="tipitaka-title">
				Tipiṭaka
			</h1>
			{pages.length > 0 ? (
				<nav aria-label="Tipiṭaka" className="tipitaka-tree">
					<TipitakaTreeList locale={locale} nodes={pages} />
				</nav>
			) : null}
		</section>
	);
}

function TipitakaTreeList({
	locale,
	nodes,
}: {
	locale: string;
	nodes: readonly TipitakaPageTreeNode[];
}) {
	return (
		<ul className="flex flex-col">
			{nodes.map((node) => (
				<li className="py-3 first:pt-0 last:pb-0" key={node.id}>
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
					{node.children.length > 0 ? (
						<div className="ml-4 border-l pl-3">
							<TipitakaTreeList locale={locale} nodes={node.children} />
						</div>
					) : null}
				</li>
			))}
		</ul>
	);
}
