import { addUserTranslation } from "../_db/mutations.server";
import { findPageBySegmentId } from "../_db/queries.server";

export async function addTranslationService(
	segmentId: number,
	text: string,
	userId: string,
	locale: string,
) {
	const page = await findPageBySegmentId(segmentId);
	if (!page) {
		return {
			success: false as const,
			message: "page not found",
		};
	}

	await addUserTranslation(segmentId, text, userId, locale);
	return {
		success: true as const,
		pageId: page.id,
	};
}
