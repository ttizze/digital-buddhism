import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
	getDatabaseClient,
	runWithDatabaseRequestContext,
} from "@/db/request-context";
import { handleVote } from "./mutation.server";

describe("handleVoteのSQLite互換性", () => {
	it("SQLiteで投票後のproof集計とステータス更新を行う", async () => {
		const dbPath = `/tmp/digital-buddshim-vote-${randomUUID()}.db`;
		try {
			await runWithDatabaseRequestContext(
				{ url: `file:${dbPath}`, authToken: undefined },
				async () => {
					const client = getDatabaseClient();
					await client.execute("CREATE TABLE pages (id INTEGER PRIMARY KEY)");
					await client.execute(
						"CREATE TABLE segments (id INTEGER PRIMARY KEY, page_id INTEGER NOT NULL)",
					);
					await client.execute(
						"CREATE TABLE segment_translations (id INTEGER PRIMARY KEY, segment_id INTEGER NOT NULL, locale TEXT NOT NULL, point INTEGER NOT NULL, user_id TEXT NOT NULL)",
					);
					await client.execute(
						"CREATE TABLE translation_votes (translation_id INTEGER NOT NULL, user_id TEXT NOT NULL, is_upvote INTEGER NOT NULL)",
					);
					await client.execute(
						"CREATE TABLE page_locale_translation_proofs (id INTEGER PRIMARY KEY AUTOINCREMENT, page_id INTEGER NOT NULL, locale TEXT NOT NULL, translation_proof_status TEXT NOT NULL, UNIQUE (page_id, locale))",
					);
					await client.execute("INSERT INTO pages (id) VALUES (1)");
					await client.execute(
						"INSERT INTO segments (id, page_id) VALUES (1, 1)",
					);
					await client.execute(
						"INSERT INTO segment_translations (id, segment_id, locale, point, user_id) VALUES (1, 1, 'ja', 0, 'translator')",
					);

					expect(await handleVote(1, true, "reviewer")).toStrictEqual({
						success: true,
						data: { isUpvote: true, point: 1 },
					});

					const proof = await client.execute(
						"SELECT translation_proof_status FROM page_locale_translation_proofs WHERE page_id = 1 AND locale = 'ja'",
					);
					expect(proof.rows).toStrictEqual([
						{ translation_proof_status: "PROOFREAD" },
					]);
				},
			);
		} finally {
			await rm(dbPath, { force: true });
		}
	});
});
