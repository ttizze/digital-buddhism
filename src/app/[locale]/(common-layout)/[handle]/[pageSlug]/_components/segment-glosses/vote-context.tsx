import { createContext, type ReactNode, useContext } from "react";
import type { KeyedMutator } from "swr";
import {
	parseSegmentGlossVoteResponse,
	type SegmentGlossUnit,
} from "@/app/api/segment-glosses/_domain/segment-glosses";
import { useVoteRequest } from "../use-vote-request";

type GlossVoteContextValue = {
	vote: (glossUnitId: number, isUpvote: boolean) => Promise<void>;
	votingGlossUnitId: number | null;
};

const GlossVoteContext = createContext<GlossVoteContextValue | null>(null);

export function SegmentGlossVoteProvider({
	children,
	locale,
	mutate,
}: {
	children: ReactNode;
	locale: string;
	mutate: KeyedMutator<SegmentGlossUnit[]>;
}) {
	const { vote, votingTargetId: votingGlossUnitId } = useVoteRequest({
		url: "/api/segment-glosses",
		targetField: "glossUnitId",
		locale,
		parseResponse: parseSegmentGlossVoteResponse,
		onSuccess: async (body) => {
			await mutate(
				(current) =>
					current?.map((unit) =>
						unit.id === body.data.glossUnit.id
							? { ...unit, ...body.data.glossUnit }
							: unit,
					),
				{ revalidate: false },
			);
		},
	});

	return (
		<GlossVoteContext.Provider value={{ vote, votingGlossUnitId }}>
			{children}
		</GlossVoteContext.Provider>
	);
}

export function useSegmentGlossVote() {
	const context = useContext(GlossVoteContext);
	if (!context) {
		throw new Error("SegmentGlossVoteProvider is required");
	}
	return context;
}
