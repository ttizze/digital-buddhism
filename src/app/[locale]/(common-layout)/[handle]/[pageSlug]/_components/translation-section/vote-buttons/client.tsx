import { ThumbsDown, ThumbsUp } from "lucide-react";
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
	return (
		<span className="flex h-full justify-end items-center">
			<span className="flex h-8">
				<VoteButton
					icon={ThumbsUp}
					isActive={voteTarget.currentUserVoteIsUpvote === true}
					isVoting={isVoting}
					onClick={() => onVote(voteTarget.id, true)}
					type="upvote"
					voteCount={voteTarget.point}
				/>
				<VoteButton
					icon={ThumbsDown}
					isActive={voteTarget.currentUserVoteIsUpvote === false}
					isVoting={isVoting}
					onClick={() => onVote(voteTarget.id, false)}
					type="downvote"
				/>
			</span>
		</span>
	);
}
