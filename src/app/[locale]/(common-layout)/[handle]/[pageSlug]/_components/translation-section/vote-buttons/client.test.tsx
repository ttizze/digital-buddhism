import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vite-plus/test";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import { VoteButtons } from "./client";

vi.mock("use-intl", () => ({
	useLocale: () => "en",
}));

const dummyTranslationUpvote = {
	id: 1,
	segmentId: 1,
	locale: "en",
	text: "hello",
	point: 10,
	createdAt: "2024-01-01T00:00:00.000Z",
	userName: "User",
	userHandle: "user",
	currentUserVoteIsUpvote: true,
} as SegmentTranslation;

const dummyTranslationDownvote = {
	id: 2,
	segmentId: 1,
	locale: "en",
	text: "world",
	point: 5,
	createdAt: "2024-01-01T00:00:00.000Z",
	userName: "User",
	userHandle: "user",
	currentUserVoteIsUpvote: false,
} as SegmentTranslation;

describe("VoteButtons コンポーネント", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	test("フォームとアップ／ダウンボタンがレンダリングされる", () => {
		render(
			<VoteButtons
				isVoting={false}
				onVote={vi.fn()}
				voteTarget={dummyTranslationUpvote}
			/>,
		);

		expect(screen.getByTestId("vote-up-button").closest("form")).not.toBeNull();
		expect(screen.getByTestId("vote-down-button")).toBeInTheDocument();
	});

	test("アップボタンが正しい投票数とアクティブ状態のアイコンクラスを表示する", () => {
		render(
			<VoteButtons
				isVoting={false}
				onVote={vi.fn()}
				voteTarget={dummyTranslationUpvote}
			/>,
		);

		const upvoteButton = screen.getByTestId("vote-up-button");
		// upvote ボタンは voteCount (10) を表示する
		expect(upvoteButton).toHaveTextContent("10");

		// ThumbsUp アイコンがレンダリングされ、アクティブ状態のクラスが含まれている
		const thumbsUpIcon = upvoteButton.querySelector("svg");
		expect(thumbsUpIcon).toBeInTheDocument();
		// アクティブの場合、"[&>path]:fill-primary" が付与される
		expect(thumbsUpIcon?.getAttribute("class") || "").toContain(
			"[&>path]:fill-primary",
		);
	});

	test("ダウンボタンがアクティブの場合、適切なアイコンクラスが付与され、voteCount は表示されない", () => {
		render(
			<VoteButtons
				isVoting={false}
				onVote={vi.fn()}
				voteTarget={dummyTranslationDownvote}
			/>,
		);

		const downvoteButton = screen.getByTestId("vote-down-button");
		expect(downvoteButton).toBeInTheDocument();

		// downvote ボタンは voteCount を表示しない（upvote のみ表示される）
		expect(downvoteButton).not.toHaveTextContent("5");

		// ThumbsDown アイコンの active クラスの確認
		const thumbsDownIcon = downvoteButton.querySelector("svg");
		expect(thumbsDownIcon).toBeInTheDocument();
		expect(thumbsDownIcon?.getAttribute("class") || "").toContain(
			"[&>path]:fill-primary",
		);
	});

	test("isVoting が true の場合、全てのボタンが disabled になる", () => {
		render(
			<VoteButtons
				isVoting
				onVote={vi.fn()}
				voteTarget={dummyTranslationUpvote}
			/>,
		);

		const upvoteButton = screen.getByTestId("vote-up-button");
		const downvoteButton = screen.getByTestId("vote-down-button");

		expect(upvoteButton).toBeDisabled();
		expect(downvoteButton).toBeDisabled();
	});

	test("選んだ投票種別と翻訳IDを親へ通知する", async () => {
		const onVote = vi.fn();
		render(
			<VoteButtons
				isVoting={false}
				onVote={onVote}
				voteTarget={dummyTranslationUpvote}
			/>,
		);

		await userEvent.click(screen.getByTestId("vote-down-button"));

		expect(onVote).toHaveBeenCalledWith(dummyTranslationUpvote.id, false);
	});
});
