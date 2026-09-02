import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { FormEvent } from "react";
import { VoteButton } from "./vote-button";

export type VoteTarget = {
	id: number;
	point: number;
	currentUserVoteIsUpvote: boolean | null;
};

interface VoteButtonsProps {
	voteTarget: VoteTarget;
	isVoting: boolean;
	onVote: (targetId: number, isUpvote: boolean) => void;
}

export function VoteButtons({
	voteTarget,
	isVoting,
	onVote,
}: VoteButtonsProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const submitter = (event.nativeEvent as SubmitEvent).submitter;
		if (submitter?.getAttribute("name") !== "isUpvote") return;

		onVote(voteTarget.id, submitter.getAttribute("value") === "true");
	};

	return (
		<span className="flex h-full justify-end items-center">
			<form onSubmit={handleSubmit}>
				<span className="flex h-8">
					<VoteButton
						icon={ThumbsUp}
						isActive={voteTarget.currentUserVoteIsUpvote === true}
						isVoting={isVoting}
						type="upvote"
						voteCount={voteTarget.point}
					/>
					<VoteButton
						icon={ThumbsDown}
						isActive={voteTarget.currentUserVoteIsUpvote === false}
						isVoting={isVoting}
						type="downvote"
					/>
				</span>
			</form>
		</span>
	);
}
