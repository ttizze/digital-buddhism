import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
	getDatabaseClient,
	runWithDatabaseRequestContext,
} from "@/db/request-context";
import { togglePageLike } from "./mutations.server";

describe("togglePageLikeのSQLite互換性", () => {
	it("SQLiteでいいね件数を返す", async () => {
		const dbPath = `/tmp/digital-buddshim-like-${randomUUID()}.db`;
		try {
			await runWithDatabaseRequestContext(
				{ url: `file:${dbPath}`, authToken: undefined },
				async () => {
					const client = getDatabaseClient();
					await client.execute(
						"CREATE TABLE pages (id INTEGER PRIMARY KEY, user_id TEXT NOT NULL)",
					);
					await client.execute(
						"CREATE TABLE like_pages (id INTEGER PRIMARY KEY AUTOINCREMENT, page_id INTEGER NOT NULL, user_id TEXT)",
					);
					await client.execute(
						"CREATE TABLE notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, type TEXT NOT NULL, actor_id TEXT NOT NULL, page_id INTEGER)",
					);
					await client.execute(
						"INSERT INTO pages (id, user_id) VALUES (1, 'owner')",
					);

					expect(await togglePageLike(1, "reader")).toStrictEqual({
						liked: true,
						likeCount: 1,
					});
				},
			);
		} finally {
			await rm(dbPath, { force: true });
		}
	});
});
