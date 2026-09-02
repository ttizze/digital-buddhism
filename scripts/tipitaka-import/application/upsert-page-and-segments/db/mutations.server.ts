import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import type { Root } from "mdast";
import type { TipitakaTextLevel } from "@/drizzle/types";

export async function upsertPage(
	tx: TransactionClient,
	p: {
		catalogKey: string;
		pageSlug: string;
		mdastJson: Root;
		textLevel: TipitakaTextLevel | null;
		parentId: number | null;
		position: number;
		importFileId: number | null;
	},
) {
	const existing = await tx
		.selectFrom("tipitakaPages")
		.select("id")
		.where("catalogKey", "=", p.catalogKey)
		.executeTakeFirst();
	const values = {
		slug: p.pageSlug,
		mdastJson: p.mdastJson,
		textLevel: p.textLevel,
		parentId: p.parentId,
		position: p.position,
		importFileId: p.importFileId,
	};

	if (existing) {
		return tx
			.updateTable("tipitakaPages")
			.set(values)
			.where("id", "=", existing.id)
			.returningAll()
			.executeTakeFirstOrThrow();
	}

	return tx
		.insertInto("tipitakaPages")
		.values({ catalogKey: p.catalogKey, ...values })
		.returningAll()
		.executeTakeFirstOrThrow();
}
