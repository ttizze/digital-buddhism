import { bestTranslationTextSubquery } from "@/app/[locale]/_db/best-translation-subquery.server";
import type { PageForTree } from "@/app/[locale]/types";
import { db } from "@/db";

export type PageTreeNode = PageForTree & {
	children: PageTreeNode[];
};

export type NavigationData = {
	rootNode: PageForTree;
	breadcrumb: PageForTree[];
};

export type PageTitleTree = PageTreeNode;

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
				.unionAll(
					qb
						.selectFrom("tipitakaPages")
						.innerJoin("ancestors", "tipitakaPages.id", "ancestors.parentId")
						.select([
							"tipitakaPages.id",
							"tipitakaPages.slug",
							"tipitakaPages.parentId",
							"tipitakaPages.position",
						]),
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

	return { rootNode, breadcrumb };
}

export async function queryPageTreeData(
	rootPageId: number,
	locale: string,
): Promise<PageTreeNode[]> {
	const rows = await fetchDescendants(rootPageId, locale);
	return buildPageTree(rows, rootPageId);
}

export async function queryChildPagesTree(
	parentId: number,
	locale: string,
): Promise<PageTitleTree[]> {
	const rows = await fetchDescendants(parentId, locale);
	return buildPageTree(rows, parentId);
}

async function fetchDescendants(
	parentId: number,
	locale: string,
): Promise<PageForTree[]> {
	return db
		.withRecursive("descendants", (qb) =>
			qb
				.selectFrom("tipitakaPages")
				.select(["id", "slug", "parentId", "position"])
				.where("parentId", "=", parentId)
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
						]),
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
	const childByParentId = new Map<number | null, PageForTree>();
	for (const node of nodes) {
		childByParentId.set(node.parentId, node);
	}

	const root = childByParentId.get(null);
	if (!root) return [];

	const ordered = [root];
	for (
		let child = childByParentId.get(root.id);
		child;
		child = childByParentId.get(child.id)
	) {
		ordered.push(child);
	}
	return ordered;
}

function buildPageTree(
	nodes: PageForTree[],
	rootPageId: number,
): PageTreeNode[] {
	const childrenByParentId = new Map<number, PageForTree[]>();
	for (const node of nodes) {
		if (node.parentId === null) continue;
		const siblings = childrenByParentId.get(node.parentId) ?? [];
		siblings.push(node);
		childrenByParentId.set(node.parentId, siblings);
	}
	for (const siblings of childrenByParentId.values()) {
		siblings.sort(
			(left, right) => left.position - right.position || left.id - right.id,
		);
	}

	const buildChildren = (parentId: number): PageTreeNode[] =>
		(childrenByParentId.get(parentId) ?? []).map((child) => ({
			...child,
			children: buildChildren(child.id),
		}));

	return buildChildren(rootPageId);
}
