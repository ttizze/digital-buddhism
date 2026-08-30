"use client";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { FormEvent } from "react";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import { VoteButton } from "./vote-button";

interface VoteButtonsProps {
	translation: SegmentTranslation;
	isVoting: boolean;
	onVote: (translationId: number, isUpvote: boolean) => void;
}

export function VoteButtons({
	translation,
	isVoting,
	onVote,
}: VoteButtonsProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const submitter = (event.nativeEvent as SubmitEvent).submitter;
		if (submitter?.getAttribute("name") !== "isUpvote") return;

		onVote(translation.id, submitter.getAttribute("value") === "true");
	};

	return (
		<span className="flex h-full justify-end items-center">
			<form onSubmit={handleSubmit}>
				<span className="flex h-8">
					<VoteButton
						isActive={translation.currentUserVoteIsUpvote === true}
						isVoting={isVoting}
						type="upvote"
						voteCount={translation.point}
					>
						{({ iconClass }) => <ThumbsUp className={iconClass} />}
					</VoteButton>
					<VoteButton
						isActive={translation.currentUserVoteIsUpvote === false}
						isVoting={isVoting}
						type="downvote"
					>
						{({ iconClass }) => <ThumbsDown className={iconClass} />}
					</VoteButton>
				</span>
			</form>
		</span>
	);
}
