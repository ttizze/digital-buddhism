import type { NotificationRowsWithRelations } from "@/app/api/notifications/_types/notification";
import { db } from "@/db";

export async function fetchNotificationRowsWithRelations(
	currentUserHandle: string,
): Promise<NotificationRowsWithRelations[]> {
	return db
		.selectFrom("notifications")
		.innerJoin("users as userUsers", "notifications.userId", "userUsers.id")
		.innerJoin("users as actorUsers", "notifications.actorId", "actorUsers.id")
		.innerJoin(
			"segmentTranslations",
			"notifications.segmentTranslationId",
			"segmentTranslations.id",
		)
		.innerJoin("segments", "segmentTranslations.segmentId", "segments.id")
		.innerJoin("pages", "segments.contentId", "pages.id")
		.innerJoin("users as pageOwners", "pages.userId", "pageOwners.id")
		.innerJoin("segments as titleSegments", (join) =>
			join
				.onRef("titleSegments.contentId", "=", "pages.id")
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
			"pages.slug as pageSlug",
			"pageOwners.handle as pageOwnerHandle",
			"titleSegments.text as pageTitle",
			"segmentTranslations.text as segmentTranslationText",
		])
		.where("userUsers.handle", "=", currentUserHandle)
		.orderBy("notifications.createdAt", "desc")
		.execute();
}
