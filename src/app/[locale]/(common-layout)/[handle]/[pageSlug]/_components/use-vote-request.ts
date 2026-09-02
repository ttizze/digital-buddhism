import { useState } from "react";
import { fetchAuthedForm } from "@/app/[locale]/_utils/fetch-authed-form";

export function useVoteRequest<ResponseBody>({
	url,
	targetField,
	locale,
	parseResponse,
	onSuccess,
}: {
	url: string;
	targetField: string;
	locale: string;
	parseResponse: (value: unknown) => ResponseBody;
	onSuccess: (body: ResponseBody) => Promise<void>;
}) {
	const [votingTargetId, setVotingTargetId] = useState<number | null>(null);

	const vote = async (targetId: number, isUpvote: boolean) => {
		if (votingTargetId !== null) return;
		setVotingTargetId(targetId);

		try {
			const response = await fetchAuthedForm({
				url,
				method: "PATCH",
				body: {
					[targetField]: String(targetId),
					isUpvote: String(isUpvote),
				},
				locale,
			});
			if (!response?.ok) return;
			await onSuccess(parseResponse(await response.json()));
		} catch {
			// 通信失敗時は最後にサーバーから確定した状態を維持する。
		} finally {
			setVotingTargetId(null);
		}
	};

	return { vote, votingTargetId };
}
