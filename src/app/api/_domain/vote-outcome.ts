export type VoteOutcome = {
	finalIsUpvote: boolean | undefined;
	pointDelta: number;
	action: "create" | "update" | "delete";
};

/** 同じ投票の再送は取消、反対側への切替は2点移動として扱う。 */
export function computeVoteOutcome(
	previousIsUpvote: boolean | undefined,
	newIsUpvote: boolean,
): VoteOutcome {
	if (previousIsUpvote === newIsUpvote) {
		return {
			finalIsUpvote: undefined,
			pointDelta: newIsUpvote ? -1 : 1,
			action: "delete",
		};
	}
	if (previousIsUpvote === undefined) {
		return {
			finalIsUpvote: newIsUpvote,
			pointDelta: newIsUpvote ? 1 : -1,
			action: "create",
		};
	}
	return {
		finalIsUpvote: newIsUpvote,
		pointDelta: newIsUpvote ? 2 : -2,
		action: "update",
	};
}
