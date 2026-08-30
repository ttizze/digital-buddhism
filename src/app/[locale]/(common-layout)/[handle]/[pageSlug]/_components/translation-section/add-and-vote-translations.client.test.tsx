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
		translation,
		onVoted,
	}: {
		translation: SegmentTranslation;
		onVoted?: (translation: SegmentTranslation) => void | Promise<void>;
	}) => (
		<button
			data-testid={`vote-${translation.id}`}
			onClick={() => onVoted?.(translation)}
			type="button"
		>
			vote
		</button>
	),
}));
vi.mock("./translation-list-item/client", () => ({
	TranslationListItem: ({
		translation,
		onVoted,
	}: {
		translation: SegmentTranslation;
		onVoted?: (translation: SegmentTranslation) => void | Promise<void>;
	}) => (
		<button
			data-testid={`vote-${translation.id}`}
			onClick={() => onVoted?.(translation)}
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
	it("初回取得した先頭訳を本文へ通知する", async () => {
		vi.mocked(useSegmentTranslations).mockReturnValue({
			data: [firstTranslation, secondTranslation],
			error: undefined,
			isLoading: false,
			mutate: vi.fn(),
		});
		const onBestTranslationChanged = vi.fn();

		render(
			<AddAndVoteTranslations
				onBestTranslationChanged={onBestTranslationChanged}
				open
				segmentId={10}
			/>,
		);

		await waitFor(() => {
			expect(onBestTranslationChanged).toHaveBeenCalledWith("first");
		});
	});

	it("投票ごとに再ランキングし、確定した先頭訳を本文へ通知する", async () => {
		const mutate = vi
			.fn()
			.mockResolvedValueOnce([secondTranslation, firstTranslation])
			.mockResolvedValueOnce([firstTranslation, secondTranslation]);
		vi.mocked(useSegmentTranslations).mockReturnValue({
			data: [firstTranslation, secondTranslation],
			error: undefined,
			isLoading: false,
			mutate,
		});
		const onBestTranslationChanged = vi.fn();
		render(
			<AddAndVoteTranslations
				onBestTranslationChanged={onBestTranslationChanged}
				open
				segmentId={10}
			/>,
		);

		await userEvent.click(screen.getByTestId("vote-2"));
		await waitFor(() => {
			expect(onBestTranslationChanged).toHaveBeenLastCalledWith("second");
		});
		await userEvent.click(screen.getByTestId("vote-1"));
		await waitFor(() => {
			expect(onBestTranslationChanged).toHaveBeenLastCalledWith("first");
		});
		expect(mutate).toHaveBeenCalledTimes(2);
	});
});
