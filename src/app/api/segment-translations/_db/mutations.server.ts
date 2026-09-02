import { db } from "@/db";

export async function addUserTranslation(
	segmentId: number,
	text: string,
	userId: string,
	locale: string,
) {
	await db
		.insertInto("segmentTranslations")
		.values({ segmentId, locale, text, userId })
		.execute();
}

/** 翻訳IDと所有者IDを突き合わせて削除し、削除できたかを返す。 */
export const deleteOwnTranslation = async (
	currentUserId: string,
	translationId: number,
): Promise<boolean> => {
	const result = await db
		.deleteFrom("segmentTranslations")
		.where("id", "=", translationId)
		.where("userId", "=", currentUserId)
		.executeTakeFirst();

	return result.numDeletedRows > 0n;
};
