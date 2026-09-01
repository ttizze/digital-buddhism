import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import {
	deleteWordGloss,
	getSegmentGlosses,
	patchWordGlossVote,
	postWordGloss,
} from "./handler";

await setupDbPerFile(import.meta.url);

const getCurrentUser = vi.fn();
vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: (...args: unknown[]) => getCurrentUser(...args),
}));

async function setupGlossData() {
	const author = await createUser({ handle: "gloss-author" });
	const voter = await createUser({ handle: "gloss-voter" });
	const page = await createPageWithSegments({
		slug: "gloss-page",
		segments: [
			{
				number: 0,
				text: "Karaṇīyam",
				textAndOccurrenceHash: "gloss-segment",
			},
		],
	});
	const segment = await db
		.selectFrom("segments")
		.select("id")
		.where("tipitakaPageId", "=", page.id)
		.executeTakeFirstOrThrow();
	const word = await db
		.insertInto("segmentWords")
		.values({
			segmentId: segment.id,
			position: 0,
			startOffset: 0,
			endOffset: 9,
			surface: "Karaṇīyam",
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	const bestGloss = await db
		.insertInto("wordGlosses")
		.values({
			wordId: word.id,
			locale: "ja",
			text: "なすべきこと",
			point: 2,
			userId: author.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	const selectedGloss = await db
		.insertInto("wordGlosses")
		.values({
			wordId: word.id,
			locale: "ja",
			text: "行うべきこと",
			point: 0,
			userId: author.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	await db
		.insertInto("selectedWordGlosses")
		.values({
			wordId: word.id,
			locale: "ja",
			glossId: selectedGloss.id,
		})
		.execute();

	return { author, bestGloss, page, selectedGloss, voter, word };
}

function formRequest(method: string, fields: Record<string, string>) {
	const formData = new FormData();
	for (const [name, value] of Object.entries(fields)) formData.set(name, value);
	return new Request("http://localhost/api/segment-glosses", {
		method,
		body: formData,
	});
}

describe("/api/segment-glosses", () => {
	beforeEach(async () => {
		await resetDatabase();
		getCurrentUser.mockReset();
	});

	it("ページGETは単語ごとに採用済み語義を優先して返す", async () => {
		const { page, selectedGloss, voter, word } = await setupGlossData();
		await db
			.insertInto("wordGlossVotes")
			.values({
				glossId: selectedGloss.id,
				userId: voter.id,
				isUpvote: true,
			})
			.execute();
		getCurrentUser.mockResolvedValue({ id: voter.id });

		const response = await getSegmentGlosses(
			new Request(
				`http://localhost/api/segment-glosses?pageId=${page.id}&locale=ja`,
			),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(await response.json()).toStrictEqual([
			expect.objectContaining({
				id: word.id,
				surface: "Karaṇīyam",
				gloss: expect.objectContaining({
					id: selectedGloss.id,
					text: "行うべきこと",
					currentUserVoteIsUpvote: true,
					isSelected: true,
				}),
			}),
		]);
	});

	it("単語GETは採用済み語義、point、新しさの順で全候補を返す", async () => {
		const { selectedGloss, word } = await setupGlossData();
		getCurrentUser.mockResolvedValue(null);

		const response = await getSegmentGlosses(
			new Request(
				`http://localhost/api/segment-glosses?wordId=${word.id}&locale=ja`,
			),
		);

		expect(response.status).toBe(200);
		const glosses = await response.json();
		expect(glosses).toHaveLength(2);
		expect(glosses[0]).toMatchObject({
			id: selectedGloss.id,
			isSelected: true,
		});
	});

	it("POSTでログインユーザーが語義候補を追加できる", async () => {
		const { voter, word } = await setupGlossData();
		getCurrentUser.mockResolvedValue({ id: voter.id });

		const response = await postWordGloss(
			formRequest("POST", {
				wordId: String(word.id),
				locale: "ja",
				text: "  為すべきこと  ",
			}),
		);

		expect(response.status).toBe(200);
		await expect(
			db
				.selectFrom("wordGlosses")
				.select(["text", "userId"])
				.where("wordId", "=", word.id)
				.where("userId", "=", voter.id)
				.executeTakeFirstOrThrow(),
		).resolves.toEqual({ text: "為すべきこと", userId: voter.id });
	});

	it("PATCHは投票の作成・取消・反対票からの切替を行う", async () => {
		const { bestGloss, voter } = await setupGlossData();
		getCurrentUser.mockResolvedValue({ id: voter.id });

		const vote = async (isUpvote: boolean) => {
			const response = await patchWordGlossVote(
				formRequest("PATCH", {
					wordGlossId: String(bestGloss.id),
					isUpvote: String(isUpvote),
				}),
			);
			expect(response.status).toBe(200);
			return (await response.json()).data.glosses.find(
				(gloss: { id: number }) => gloss.id === bestGloss.id,
			);
		};

		expect(await vote(true)).toMatchObject({
			point: 3,
			currentUserVoteIsUpvote: true,
		});
		expect(await vote(true)).toMatchObject({
			point: 2,
			currentUserVoteIsUpvote: null,
		});
		expect(await vote(false)).toMatchObject({
			point: 1,
			currentUserVoteIsUpvote: false,
		});
		expect(await vote(true)).toMatchObject({
			point: 3,
			currentUserVoteIsUpvote: true,
		});
	});

	it("DELETEは自分の語義候補だけを削除する", async () => {
		const { author, selectedGloss, voter } = await setupGlossData();
		getCurrentUser.mockResolvedValue({ id: voter.id });

		const denied = await deleteWordGloss(
			formRequest("DELETE", { glossId: String(selectedGloss.id) }),
		);
		expect(denied.status).toBe(404);

		getCurrentUser.mockResolvedValue({ id: author.id });
		const deleted = await deleteWordGloss(
			formRequest("DELETE", { glossId: String(selectedGloss.id) }),
		);
		expect(deleted.status).toBe(200);
		await expect(
			db
				.selectFrom("wordGlosses")
				.select("id")
				.where("id", "=", selectedGloss.id)
				.executeTakeFirst(),
		).resolves.toBeUndefined();
	});

	it("書き込みは未ログインを拒否する", async () => {
		getCurrentUser.mockResolvedValue(null);
		const response = await patchWordGlossVote(
			formRequest("PATCH", { wordGlossId: "1", isUpvote: "true" }),
		);
		expect(response.status).toBe(401);
	});
});
