import type { PageTreeNode } from "../../_db/queries";
import type { CollapsibleTreeNode } from "./collapsible-tree-list";
import { PageTreeLink } from "./page-tree-link";

export function toCollapsibleTreeNodes(
	nodes: PageTreeNode[],
	locale: string,
): CollapsibleTreeNode[] {
	return nodes.map((node) => ({
		id: node.id,
		label: <PageTreeLink locale={locale} node={node} />,
		children: toCollapsibleTreeNodes(node.children, locale),
	}));
}
