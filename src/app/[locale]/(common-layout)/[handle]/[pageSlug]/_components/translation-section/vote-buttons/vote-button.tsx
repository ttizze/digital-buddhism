import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoteButtonProps {
	type: "upvote" | "downvote";
	isActive: boolean | undefined;
	isVoting: boolean;
	voteCount?: number;
	icon: LucideIcon;
}

export function VoteButton({
	type,
	isActive,
	isVoting,
	voteCount,
	icon: Icon,
}: VoteButtonProps) {
	const testId = type === "upvote" ? "vote-up-button" : "vote-down-button";
	const iconClass = `mr-2 h-4 w-4 transition-all duration-300 ${
		isActive ? "[&>path]:fill-primary" : ""
	} ${isVoting ? "animate-bounce" : ""}`;

	return (
		<Button
			data-testid={testId}
			disabled={isVoting}
			name="isUpvote"
			size="sm"
			type="submit"
			value={type === "upvote" ? "true" : "false"}
			variant="ghost"
		>
			<Icon className={iconClass} />
			{type === "upvote" && voteCount !== undefined && voteCount}
		</Button>
	);
}
