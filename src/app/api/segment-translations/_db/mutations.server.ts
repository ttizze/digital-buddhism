import { sql } from "kysely";
import { db } from "@/db";

/** 翻訳IDと所有者のhandleを1回のクエリで突き合わせて削除し、削除できたかを返す */
export const deleteOwnTranslation = async (
	currentHandle: string,
	translationId: number,
): Promise<boolean> => {
	const result = await db
		.deleteFrom("segmentTranslations")
		.where("id", "=", translationId)
		.where((eb) =>
			eb.exists(
				eb
					.selectFrom("users")
					.select(sql`1`.as("one"))
					.whereRef("users.id", "=", "segmentTranslations.userId")
					.where("users.handle", "=", currentHandle),
			),
		)
		.executeTakeFirst();

	return result.numDeletedRows > 0n;
};
