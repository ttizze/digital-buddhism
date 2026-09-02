export type TipitakaPageRow = {
	id: number;
	slug: string;
	parentId: number | null;
	position: number;
	titleSegmentId: number;
	titleText: string;
	titleTranslationText: string | null;
};

export type TipitakaPageTreeNode = {
	id: number;
	slug: string;
	parentId: number;
	position: number;
	titleSegmentId: number;
	titleText: string;
	titleTranslationText: string | null;
	children: TipitakaPageTreeNode[];
};

/** DBで公開条件を満たしたTipiṭakaページを親子関係と順序で木にする。 */
export function extractTipitakaPageTree(
	rows: readonly TipitakaPageRow[],
	rootPageId: number,
): TipitakaPageTreeNode[] {
	const rowsByParent = new Map<number, TipitakaPageRow[]>();

	for (const row of rows) {
		if (row.parentId === null) continue;
		const siblings = rowsByParent.get(row.parentId) ?? [];
		siblings.push(row);
		rowsByParent.set(row.parentId, siblings);
	}

	const buildChildren = (
		parentId: number,
		ancestors: ReadonlySet<number>,
	): TipitakaPageTreeNode[] => {
		const siblings = rowsByParent.get(parentId) ?? [];
		const sortedSiblings = [...siblings].sort(
			(left, right) => left.position - right.position || left.id - right.id,
		);
		const children: TipitakaPageTreeNode[] = [];
		for (const row of sortedSiblings) {
			if (ancestors.has(row.id)) continue;
			const nextAncestors = new Set(ancestors);
			nextAncestors.add(row.id);
			children.push({
				id: row.id,
				slug: row.slug,
				parentId: row.parentId as number,
				position: row.position,
				titleSegmentId: row.titleSegmentId,
				titleText: row.titleText,
				titleTranslationText: row.titleTranslationText,
				children: buildChildren(row.id, nextAncestors),
			});
		}
		return children;
	};

	return buildChildren(rootPageId, new Set([rootPageId]));
}

export { TIPITAKA_ROOT_SLUG } from "@/app/[locale]/_domain/tipitaka-page-visibility";
