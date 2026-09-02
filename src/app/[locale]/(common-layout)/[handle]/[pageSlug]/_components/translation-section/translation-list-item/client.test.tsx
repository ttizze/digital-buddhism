import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vite-plus/test";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import { TranslationListItem } from "./client";

vi.mock("use-intl", async () => {
	const { createEnTranslator } = await import("@/tests/en-translations");
	return {
		useTranslations: (namespace?: string) => createEnTranslator(namespace),
	};
});
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/app/_hooks/use-hydrated", () => ({
	useHydrated: () => true,
}));
vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: {
		useSession: () => ({ data: null }),
	},
}));
vi.mock("../vote-buttons/client", () => ({
	VoteButtons: () => null,
}));

const translation = {
	id: 1,
	segmentId: 10,
	locale: "ja",
	text: "<strong>translation</strong>\nsecond line",
	point: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	userName: "Translator",
	userHandle: "translator",
	currentUserVoteIsUpvote: null,
	isSelected: false,
} satisfies SegmentTranslation;

describe("TranslationListItem", () => {
	it("ユーザー翻訳をHTMLとして解釈せず、改行を保持する", () => {
		const { container } = render(
			<TranslationListItem
				isVoting={false}
				onVote={vi.fn()}
				translation={translation}
			/>,
		);

		const text = screen.getByText(/<strong>translation<\/strong>/);
		expect(text.textContent).toBe("<strong>translation</strong>\nsecond line");
		expect(text).toHaveClass("whitespace-pre-wrap");
		expect(container.querySelector("strong")).toBeNull();
	});
});
