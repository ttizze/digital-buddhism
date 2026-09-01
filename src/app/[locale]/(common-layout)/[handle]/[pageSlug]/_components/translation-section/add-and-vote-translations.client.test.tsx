import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import { AddAndVoteTranslations } from "./add-and-vote-translations.client";
import { useSegmentTranslations } from "./hooks/use-segment-translations";

vi.mock("use-intl", () => ({ useLocale: () => "ja" }));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./hooks/use-segment-translations", () => ({
	useSegmentTranslations: vi.fn(),
}));
vi.mock("./add-translation-form/client", () => ({
	AddTranslationForm: () => null,
}));
vi.mock("./vote-buttons/client", () => ({
	VoteButtons: ({
		voteTarget,
		isVoting,
		onVote,
	}: {
		voteTarget: SegmentTranslation;
		isVoting: boolean;
		onVote: (translationId: number, isUpvote: boolean) => void;
	}) => (
		<button
			data-testid={`vote-${voteTarget.id}`}
			disabled={isVoting}
			onClick={() => onVote(voteTarget.id, true)}
			type="button"
		>
			vote
		</button>
	),
}));
vi.mock("./translation-list-item/client", () => ({
	TranslationListItem: ({
		translation,
		isVoting,
		onVote,
	}: {
		translation: SegmentTranslation;
		isVoting: boolean;
		onVote: (translationId: number, isUpvote: boolean) => void;
	}) => (
		<button
			data-testid={`vote-${translation.id}`}
			disabled={isVoting}
			onClick={() => onVote(translation.id, true)}
			type="button"
		>
			{translation.text}
		</button>
	),
}));

const firstTranslation = {
	id: 1,
	segmentId: 10,
	locale: "ja",
	text: "first",
	point: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	userName: "First",
	userHandle: "first",
	currentUserVoteIsUpvote: null,
	isSelected: false,
} satisfies SegmentTranslation;

const secondTranslation = {
	...firstTranslation,
	id: 2,
	text: "second",
	point: 0,
	userName: "Second",
	userHandle: "second",
} satisfies SegmentTranslation;

describe("AddAndVoteTranslations", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("初回取得した先頭訳を本文へ反映する", async () => {
		vi.mocked(useSegmentTranslations).mockReturnValue({
			data: [firstTranslation, secondTranslation],
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: vi.fn(),
		});
		const translationElement = document.createElement("span");

		render(
			<AddAndVoteTranslations
				open
				segmentId={10}
				translationElement={translationElement}
			/>,
		);

		await waitFor(() => {
			expect(translationElement).toHaveTextContent("first");
		});
	});

	it("PATCHが返した最新順位を再GETせず確定状態にする", async () => {
		const mutate = vi.fn().mockResolvedValue(undefined);
		vi.mocked(useSegmentTranslations).mockReturnValue({
			data: [firstTranslation, secondTranslation],
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate,
		});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({
					success: true,
					data: { translations: [secondTranslation, firstTranslation] },
				}),
			)
			.mockResolvedValueOnce(
				Response.json({
					success: true,
					data: { translations: [firstTranslation, secondTranslation] },
				}),
			);
		vi.stubGlobal("fetch", fetchMock);
		const translationElement = document.createElement("span");
		render(
			<AddAndVoteTranslations
				open
				segmentId={10}
				translationElement={translationElement}
			/>,
		);

		await userEvent.click(screen.getByTestId("vote-2"));
		await waitFor(() => {
			expect(mutate).toHaveBeenNthCalledWith(
				1,
				[secondTranslation, firstTranslation],
				{ revalidate: false },
			);
		});
		await userEvent.click(screen.getByTestId("vote-1"));
		await waitFor(() => {
			expect(mutate).toHaveBeenNthCalledWith(
				2,
				[firstTranslation, secondTranslation],
				{ revalidate: false },
			);
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(mutate).toHaveBeenCalledTimes(2);
	});
});
