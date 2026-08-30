import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { fetchNotificationRowsWithRelations } from "./queries.server";

await setupDbPerFile(import.meta.url);

describe("fetchNotificationRowsWithRelations", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("ページ翻訳投票をページ情報付きで返す", async () => {
		const recipient = await createUser({ handle: "notification-recipient" });
		const actor = await createUser({
			handle: "notification-actor",
			name: "Notification Actor",
			image: "https://example.com/actor.png",
		});
		const page = await createPageWithSegments({
			slug: "notification-page",
			segments: [
				{
					number: 0,
					text: "Notification Page",
					textAndOccurrenceHash: "notification-title",
				},
				{
					number: 1,
					text: "Notification segment",
					textAndOccurrenceHash: "notification-segment",
				},
			],
		});
		const segment = await db
			.selectFrom("segments")
			.select("id")
			.where("tipitakaPageId", "=", page.id)
			.where("number", "=", 1)
			.executeTakeFirstOrThrow();
		const translation = await db
			.insertInto("segmentTranslations")
			.values({
				segmentId: segment.id,
				locale: "ja",
				text: "翻訳された通知セグメント",
				userId: recipient.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();

		await db
			.insertInto("notifications")
			.values({
				userId: recipient.id,
				actorId: actor.id,
				segmentTranslationId: translation.id,
			})
			.execute();

		const notifications = await fetchNotificationRowsWithRelations(
			recipient.handle,
		);

		expect(notifications).toHaveLength(1);
		expect(notifications[0]).toEqual(
			expect.objectContaining({
				actorId: actor.id,
				actorHandle: "notification-actor",
				segmentTranslationText: "翻訳された通知セグメント",
				pageSlug: "notification-page",
				pageOwnerHandle: "tipitaka",
				pageTitle: "Notification Page",
			}),
		);
	});
});
