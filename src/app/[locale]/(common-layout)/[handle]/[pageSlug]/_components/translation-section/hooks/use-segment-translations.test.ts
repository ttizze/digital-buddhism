import { act, renderHook } from "@testing-library/react";
import useSWR from "swr";
import { type Mock, vi } from "vitest";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import { useSegmentTranslations } from "./use-segment-translations";

vi.mock("swr", () => ({ default: vi.fn() }));

const bestTranslation = {
	id: 1,
	segmentId: 10,
	locale: "ja",
	text: "現在本文に表示されている訳",
	point: 2,
	createdAt: "2026-01-01T00:00:00.000Z",
	userName: "First",
	userHandle: "first",
	currentUserVoteIsUpvote: null,
	isSelected: false,
} satisfies SegmentTranslation;

const alternativeTranslation = {
	...bestTranslation,
	id: 2,
	text: "別の訳",
	point: 1,
	userName: "Second",
	userHandle: "second",
} satisfies SegmentTranslation;

describe("useSegmentTranslations", () => {
	it("投票後は対象だけを更新し、本文と対応する表示順を維持する", async () => {
		const mutate = vi.fn().mockResolvedValue(undefined);
		(useSWR as unknown as Mock).mockReturnValue({
			data: [bestTranslation, alternativeTranslation],
			error: undefined,
			isLoading: false,
			mutate,
		});
		const { result } = renderHook(() =>
			useSegmentTranslations({
				segmentId: 10,
				userLocale: "ja",
				enabled: true,
			}),
		);
		const updatedAlternative = {
			...alternativeTranslation,
			point: 3,
			currentUserVoteIsUpvote: true,
		};

		await act(async () => {
			await result.current.updateVote(updatedAlternative);
		});

		const [updateCache, options] = mutate.mock.calls[0];
		const updated = updateCache([bestTranslation, alternativeTranslation]);
		expect(updated).toStrictEqual([bestTranslation, updatedAlternative]);
		expect(options).toStrictEqual({ revalidate: false });
	});
});
