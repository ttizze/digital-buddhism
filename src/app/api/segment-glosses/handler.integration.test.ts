import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { createPageWithSegments, createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { getSegmentGlosses, patchSegmentGlossVote } from "./handler";

await setupDbPerFile(import.meta.url);

const getCurrentUser = vi.fn();
vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: (...args: unknown[]) => getCurrentUser(...args),
}));

async function createGlossUnit({
	segmentId,
	userId,
	selected,
	gloss,
}: {
	segmentId: number;
	userId: string;
	selected: boolean;
	gloss: string;
}) {
	const glossSet = await db
		.insertInto("segmentGlossSets")
		.values({ segmentId, locale: "ja", userId })
		.returning("id")
		.executeTakeFirstOrThrow();
	const unit = await db
		.insertInto("segmentGlossUnits")
		.values({
			glossSetId: glossSet.id,
			position: 0,
			startOffset: 0,
			endOffset: 9,
			surface: "Karaṇīyam",
			gloss,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	if (selected) {
		await db
			.insertInto("selectedSegmentGlossSets")
			.values({ segmentId, locale: "ja", glossSetId: glossSet.id })
			.execute();
	}
	return unit;
}

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
	const selectedUnit = await createGlossUnit({
		segmentId: segment.id,
		userId: author.id,
		selected: true,
		gloss: "なすべきこと",
	});
	await createGlossUnit({
		segmentId: segment.id,
		userId: author.id,
		selected: false,
		gloss: "非選択の語義",
	});
	return { page, selectedUnit, voter };
}

function voteRequest(glossUnitId: number, isUpvote: boolean) {
	const formData = new FormData();
	formData.set("glossUnitId", String(glossUnitId));
	formData.set("isUpvote", String(isUpvote));
	return new Request("http://localhost/api/segment-glosses", {
		method: "PATCH",
		body: formData,
	});
}

describe("/api/segment-glosses", () => {
	beforeEach(async () => {
		await resetDatabase();
		getCurrentUser.mockReset();
	});

	it("GETはページ・言語で選択中の語義だけを返し、自分の票を含める", async () => {
		const { page, selectedUnit, voter } = await setupGlossData();
		await db
			.insertInto("segmentGlossUnitVotes")
			.values({
				glossUnitId: selectedUnit.id,
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
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(await response.json()).toStrictEqual([
			expect.objectContaining({
				id: selectedUnit.id,
				gloss: "なすべきこと",
				currentUserVoteIsUpvote: true,
			}),
		]);
	});

	it("PATCHは既存投票と同じ規則で作成・取消・反対票からの切替を行う", async () => {
		const { selectedUnit, voter } = await setupGlossData();
		getCurrentUser.mockResolvedValue({ id: voter.id });

		const vote = async (isUpvote: boolean) => {
			const response = await patchSegmentGlossVote(
				voteRequest(selectedUnit.id, isUpvote),
			);
			expect(response.status).toBe(200);
			return (await response.json()).data.glossUnit;
		};

		expect(await vote(true)).toMatchObject({
			point: 1,
			currentUserVoteIsUpvote: true,
		});
		expect(await vote(true)).toMatchObject({
			point: 0,
			currentUserVoteIsUpvote: null,
		});
		expect(await vote(false)).toMatchObject({
			point: -1,
			currentUserVoteIsUpvote: false,
		});
		expect(await vote(true)).toMatchObject({
			point: 1,
			currentUserVoteIsUpvote: true,
		});

		const votes = await db
			.selectFrom("segmentGlossUnitVotes")
			.select(["glossUnitId", "userId", "isUpvote"])
			.execute();
		expect(votes).toStrictEqual([
			{
				glossUnitId: selectedUnit.id,
				userId: voter.id,
				isUpvote: true,
			},
		]);
	});

	it("PATCHは未ログインを拒否する", async () => {
		getCurrentUser.mockResolvedValue(null);
		const response = await patchSegmentGlossVote(voteRequest(1, true));
		expect(response.status).toBe(401);
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(await response.json()).toEqual({ message: "Unauthorized" });
	});
});
