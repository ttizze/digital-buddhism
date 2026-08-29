import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import type { JsonValue, PageStatus } from "@/drizzle/types";

/**
 * Kysely版に移行済み。
 * 既存なら更新し、新規ならpagesへ直接INSERTする。
 */
export async function upsertPage(
	tx: TransactionClient,
	p: {
		pageSlug: string;
		userId: string;
		mdastJson: JsonValue;
		sourceLocale: string;
		parentId: number | null;
		order: number | null;
		status: PageStatus | null;
	},
) {
	// 既存ページのidを取得（1回のクエリ）
	const existing = await tx
		.selectFrom("pages")
		.select("id")
		.where("slug", "=", p.pageSlug)
		.executeTakeFirst();

	if (existing) {
		// 既存の場合はUPDATEで更新（PRIMARY KEY制約違反を避けるため）
		const updateData: {
			mdastJson: JsonValue;
			sourceLocale: string;
			parentId?: number | null;
			order?: number;
			status?: PageStatus;
		} = {
			mdastJson: p.mdastJson,
			sourceLocale: p.sourceLocale,
		};

		if (p.parentId !== null) {
			updateData.parentId = p.parentId;
		}
		if (p.order !== null) {
			updateData.order = p.order;
		}
		if (p.status !== null) {
			updateData.status = p.status;
		}

		const updated = await tx
			.updateTable("pages")
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
		.insertInto("pages")
		.values({
			slug: p.pageSlug,
			userId: p.userId,
			mdastJson: p.mdastJson,
			sourceLocale: p.sourceLocale,
			parentId: p.parentId,
			order: p.order ?? 0,
			status: p.status ?? "DRAFT",
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	return page;
}
