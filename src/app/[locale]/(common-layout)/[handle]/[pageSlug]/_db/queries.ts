import { bestTranslationTextSubquery } from "@/app/[locale]/_db/best-translation-subquery.server";
import type { PageForTree } from "@/app/[locale]/types";
import { db } from "@/db";

export type PageTreeNode = PageForTree & {
	children: PageTreeNode[];
};

export type NavigationData = {
	rootNode: PageForTree;
	treeNodes: PageTreeNode[];
	breadcrumb: PageForTree[];
};

export type PageTitleTree = PageForTree & { children: PageTitleTree[] };

export async function queryPageNavigationData(
	pageId: number,
	locale: string,
): Promise<NavigationData | null> {
	const ancestorRows = await db
		.withRecursive("ancestors", (qb) =>
			qb
				.selectFrom("tipitakaPages")
				.select(["id", "slug", "parentId", "position"])
				.where(
					"id",
					"=",
					db
						.selectFrom("tipitakaPages")
						.select("parentId")
						.where("id", "=", pageId),
				)
				.where("isVisible", "=", true)
				.unionAll(
					qb
						.selectFrom("tipitakaPages")
						.innerJoin("ancestors", "tipitakaPages.id", "ancestors.parentId")
						.select([
							"tipitakaPages.id",
							"tipitakaPages.slug",
							"tipitakaPages.parentId",
							"tipitakaPages.position",
						])
						.where("tipitakaPages.isVisible", "=", true),
				),
		)
		.selectFrom("ancestors")
		.innerJoin("segments", (join) =>
			join
				.onRef("segments.tipitakaPageId", "=", "ancestors.id")
				.on("segments.number", "=", 0),
		)
		.select([
			"ancestors.id",
			"ancestors.slug",
			"ancestors.parentId",
			"ancestors.position",
			"segments.id as titleSegmentId",
			"segments.text as titleText",
		])
		.select((eb) =>
			bestTranslationTextSubquery({
				locale,
				segmentId: eb.ref("segments.id"),
			}).as("titleTranslationText"),
		)
		.execute();

	if (ancestorRows.length === 0) return null;
	const breadcrumb = orderAncestorsFromRoot(ancestorRows);
	const rootNode = breadcrumb[0];
	if (!rootNode) return null;

	const descendantRows = await fetchVisibleDescendants(rootNode.id, locale);
	return {
		rootNode,
		treeNodes: buildTree(descendantRows, rootNode.id),
		breadcrumb,
	};
}

export async function queryChildPagesTree(
	parentId: number,
	locale: string,
): Promise<PageTitleTree[]> {
	const rows = await fetchVisibleDescendants(parentId, locale);
	return buildTitleTree(rows, parentId);
}

async function fetchVisibleDescendants(
	parentId: number,
	locale: string,
): Promise<PageForTree[]> {
	return db
		.withRecursive("descendants", (qb) =>
			qb
				.selectFrom("tipitakaPages")
				.select(["id", "slug", "parentId", "position"])
				.where("parentId", "=", parentId)
				.where("isVisible", "=", true)
				.unionAll(
					qb
						.selectFrom("tipitakaPages")
						.innerJoin(
							"descendants",
							"tipitakaPages.parentId",
							"descendants.id",
						)
						.select([
							"tipitakaPages.id",
							"tipitakaPages.slug",
							"tipitakaPages.parentId",
							"tipitakaPages.position",
						])
						.where("tipitakaPages.isVisible", "=", true),
				),
		)
		.selectFrom("descendants")
		.innerJoin("segments", (join) =>
			join
				.onRef("segments.tipitakaPageId", "=", "descendants.id")
				.on("segments.number", "=", 0),
		)
		.select([
			"descendants.id",
			"descendants.slug",
			"descendants.parentId",
			"descendants.position",
			"segments.id as titleSegmentId",
			"segments.text as titleText",
		])
		.select((eb) =>
			bestTranslationTextSubquery({
				locale,
				segmentId: eb.ref("segments.id"),
			}).as("titleTranslationText"),
		)
		.execute();
}

export async function queryCompletedTranslationLocales(
	pageId: number,
): Promise<string[]> {
	const jobs = await db
		.selectFrom("translationJobs")
		.select("locale")
		.distinct()
		.where("pageId", "=", pageId)
		.where("status", "=", "COMPLETED")
		.orderBy("locale")
		.execute();
	return jobs.map((job) => job.locale);
}

function orderAncestorsFromRoot(nodes: PageForTree[]): PageForTree[] {
	const byId = new Map(nodes.map((node) => [node.id, node]));
	const root = nodes.find((node) => node.parentId === null);
	if (!root) return [];
	const ordered = [root];
	while (ordered.length < nodes.length) {
		const child = nodes.find(
			(node) => node.parentId === ordered[ordered.length - 1]?.id,
		);
		if (!child || byId.get(child.id) !== child) break;
		ordered.push(child);
	}
	return ordered;
}

function buildTree(nodes: PageForTree[], parentId: number): PageTreeNode[] {
	const children = nodes
		.filter((node) => node.parentId === parentId)
		.sort((a, b) => a.position - b.position);
	return children.map((child) => ({
		...child,
		children: buildTree(nodes, child.id),
	}));
}

function buildTitleTree(
	nodes: PageForTree[],
	parentId: number,
): PageTitleTree[] {
	const children = nodes
		.filter((node) => node.parentId === parentId)
		.sort((a, b) => a.position - b.position);
	return children.map((child) => ({
		...child,
		children: buildTitleTree(nodes, child.id),
	}));
}
