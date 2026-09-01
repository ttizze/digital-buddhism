"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import type { KeyedMutator } from "swr";
import { fetchAuthedForm } from "@/app/[locale]/_utils/fetch-authed-form";
import {
	type SegmentGlossUnit,
	segmentGlossVoteResponseSchema,
} from "@/app/api/segment-glosses/_domain/segment-glosses";

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
	const [votingGlossUnitId, setVotingGlossUnitId] = useState<number | null>(
		null,
	);

	const vote = async (glossUnitId: number, isUpvote: boolean) => {
		if (votingGlossUnitId !== null) return;

		setVotingGlossUnitId(glossUnitId);

		try {
			const response = await fetchAuthedForm({
				url: "/api/segment-glosses",
				method: "PATCH",
				body: {
					glossUnitId: String(glossUnitId),
					isUpvote: String(isUpvote),
				},
				locale,
			});
			if (!response?.ok) return;

			const body = segmentGlossVoteResponseSchema.parse(await response.json());
			await mutate(
				(current) =>
					current?.map((unit) =>
						unit.id === body.data.glossUnit.id
							? { ...unit, ...body.data.glossUnit }
							: unit,
					),
				{ revalidate: false },
			);
		} catch {
			// 通信失敗時は最後にサーバーから確定した一覧を維持する。
		} finally {
			setVotingGlossUnitId(null);
		}
	};

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
