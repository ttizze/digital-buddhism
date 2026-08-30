import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import type { JsonValue, TipitakaPageKind } from "@/drizzle/types";

/**
 * Kysely版に移行済み。
 * 既存なら更新し、新規ならpagesへ直接INSERTする。
 */
export async function upsertPage(
	tx: TransactionClient,
	p: {
		pageSlug: string;
		mdastJson: JsonValue;
		kind: TipitakaPageKind;
		parentId: number | null;
		position: number;
		isVisible: boolean;
	},
) {
	// 既存ページのidを取得（1回のクエリ）
	const existing = await tx
		.selectFrom("tipitakaPages")
		.select("id")
		.where("slug", "=", p.pageSlug)
		.executeTakeFirst();

	if (existing) {
		// 既存の場合はUPDATEで更新（PRIMARY KEY制約違反を避けるため）
		const updateData = {
			mdastJson: p.mdastJson,
			kind: p.kind,
			parentId: p.parentId,
			position: p.position,
			isVisible: p.isVisible,
		};

		const updated = await tx
			.updateTable("tipitakaPages")
			.set(updateData)
			.where("slug", "=", p.pageSlug)
			.returningAll()
			.executeTakeFirst();

		if (!updated) {
			throw new Error(`Failed to update page with slug ${p.pageSlug}`);
		}

		return updated;
	}

	const page = await tx
		.insertInto("tipitakaPages")
		.values({
			slug: p.pageSlug,
			mdastJson: p.mdastJson,
			kind: p.kind,
			parentId: p.parentId,
			position: p.position,
			isVisible: p.isVisible,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	return page;
}
