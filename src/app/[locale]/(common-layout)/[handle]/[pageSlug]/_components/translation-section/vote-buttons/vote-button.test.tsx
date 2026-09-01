// VoteButton.test.tsx
import { render, screen } from "@testing-library/react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { VoteButton } from "./vote-button";

describe("VoteButton コンポーネント", () => {
	test("upvote タイプの場合、voteCount とアクティブ状態のクラスが正しく表示される", () => {
		render(
			<VoteButton
				icon={ThumbsUp}
				isActive={true}
				isVoting={false}
				type="upvote"
				voteCount={15}
			/>,
		);

		const button = screen.getByTestId("vote-up-button");
		expect(button).toBeInTheDocument();
		expect(button).not.toBeDisabled();
		// upvote の場合、voteCount がレンダリングされる
		expect(button).toHaveTextContent("15");

		// アイコンに iconClass が正しく付与されているか検証
		const iconElement = button.querySelector("svg");
		expect(iconElement).not.toBeNull();
		expect(iconElement?.getAttribute("class")).toContain(
			"mr-2 h-4 w-4 transition-all duration-300",
		);
		// isActive が true の場合、fill-primary のクラスが含まれる
		expect(iconElement?.getAttribute("class")).toContain(
			"[&>path]:fill-primary",
		);
		// isVoting が false なので animate-bounce は含まれない
		expect(iconElement?.getAttribute("class")).not.toContain("animate-bounce");
	});

	test("downvote タイプの場合、voteCount は表示されず、アクティブ状態のクラスも含まれない", () => {
		render(
			<VoteButton
				icon={ThumbsDown}
				isActive={false}
				isVoting={false}
				type="downvote"
				voteCount={20}
			/>,
		);

		const button = screen.getByTestId("vote-down-button");
		expect(button).toBeInTheDocument();
		expect(button).not.toBeDisabled();
		// downvote の場合、voteCount は表示されない
		expect(button).not.toHaveTextContent("20");

		const iconElement = button.querySelector("svg");
		// isActive が false の場合、fill-primary クラスは付与されない
		expect(iconElement?.getAttribute("class")).not.toContain(
			"[&>path]:fill-primary",
		);
	});

	test("isVoting が true の場合、ボタンは disabled になる", () => {
		render(
			<VoteButton
				icon={ThumbsUp}
				isActive={false}
				isVoting={true}
				type="upvote"
				voteCount={5}
			/>,
		);

		const button = screen.getByTestId("vote-up-button");
		expect(button).toBeDisabled();
	});

	test("isVoting が true の場合、iconClass に animate-bounce が含まれる", () => {
		render(
			<VoteButton
				icon={ThumbsDown}
				isActive={false}
				isVoting={true}
				type="downvote"
			/>,
		);

		const button = screen.getByTestId("vote-down-button");
		const iconElement = button.querySelector("svg");
		expect(iconElement?.getAttribute("class")).toContain("animate-bounce");
	});
});
