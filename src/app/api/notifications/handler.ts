import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import {
	privateJsonResponse,
	withAuthedRequest,
} from "@/app/api/_utils/with-authed-request";
import { markAllNotificationAsRead } from "./_db/mutations.server";
import { fetchNotificationRowsWithRelations } from "./_db/queries.server";
import type { NotificationJson } from "./_types/notification";

export async function getNotifications(request: Request): Promise<Response> {
	const user = await getCurrentUserFromHeaders(request.headers);
	if (!user) {
		return privateJsonResponse({ notifications: [] }, {});
	}

	const rows = await fetchNotificationRowsWithRelations(user.id);
	const notifications: NotificationJson[] = rows.map((notification) => ({
		...notification,
		createdAt: notification.createdAt.toISOString(),
	}));
	return privateJsonResponse({ notifications }, {});
}

export async function markNotificationsAsRead(
	request: Request,
): Promise<Response> {
	return withAuthedRequest(request, async (user) => {
		await markAllNotificationAsRead(user.id);
		return Response.json({ success: true }, { status: 200 });
	});
}
