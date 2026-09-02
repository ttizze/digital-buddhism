import type { NotificationRowsWithRelations } from "@/app/api/notifications/_types/notification";
import { db } from "@/db";

export async function fetchNotificationRowsWithRelations(
	currentUserId: string,
): Promise<NotificationRowsWithRelations[]> {
	return db
		.selectFrom("notifications")
		.innerJoin("users as actorUsers", "notifications.actorId", "actorUsers.id")
		.innerJoin(
			"segmentTranslations",
			"notifications.segmentTranslationId",
			"segmentTranslations.id",
		)
		.innerJoin("segments", "segmentTranslations.segmentId", "segments.id")
		.innerJoin("tipitakaPages", "segments.tipitakaPageId", "tipitakaPages.id")
		.innerJoin("segments as titleSegments", (join) =>
			join
				.onRef("titleSegments.tipitakaPageId", "=", "tipitakaPages.id")
				.on("titleSegments.number", "=", 0),
		)
		.select([
			"notifications.id",
			"notifications.actorId",
			"notifications.read",
			"notifications.createdAt",
			"actorUsers.handle as actorHandle",
			"actorUsers.image as actorImage",
			"actorUsers.name as actorName",
			"tipitakaPages.slug as pageSlug",
			"titleSegments.text as pageTitle",
			"segmentTranslations.text as segmentTranslationText",
		])
		.where("notifications.userId", "=", currentUserId)
		.orderBy("notifications.createdAt", "desc")
		.execute();
}
