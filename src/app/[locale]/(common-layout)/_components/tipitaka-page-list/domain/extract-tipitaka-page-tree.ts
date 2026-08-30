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
		return [...siblings]
			.sort(
				(left, right) => left.position - right.position || left.id - right.id,
			)
			.filter((row) => !ancestors.has(row.id))
			.map((row) => {
				const nextAncestors = new Set(ancestors);
				nextAncestors.add(row.id);
				return {
					id: row.id,
					slug: row.slug,
					parentId: row.parentId as number,
					position: row.position,
					titleSegmentId: row.titleSegmentId,
					titleText: row.titleText,
					titleTranslationText: row.titleTranslationText,
					children: buildChildren(row.id, nextAncestors),
				};
			});
	};

	return buildChildren(rootPageId, new Set([rootPageId]));
}

export {
	TIPITAKA_ROOT_SLUG,
	TIPITAKA_SOURCE_LOCALE,
} from "@/app/[locale]/_domain/tipitaka-page-visibility";
