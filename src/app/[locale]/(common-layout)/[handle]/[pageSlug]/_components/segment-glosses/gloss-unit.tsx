"use client";

import type { ReactNode } from "react";
import type { SegmentGlossUnit } from "@/app/api/segment-glosses/_domain/segment-glosses";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { VoteButtons } from "../translation-section/vote-buttons/client";
import { useSegmentGlossVote } from "./vote-context";

export function GlossUnit({
	children,
	unit,
}: {
	children: ReactNode;
	unit: SegmentGlossUnit;
}) {
	const { vote, votingGlossUnitId } = useSegmentGlossVote();

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					aria-label={`${unit.surface}の語義「${unit.gloss}」を評価`}
					className="inline cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 [color:inherit] [font:inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
					data-gloss-unit-id={unit.id}
					type="button"
				>
					<ruby className="whitespace-nowrap [ruby-position:over]">
						{children}
						<rp>（</rp>
						<rt
							className="select-none text-[0.55em] leading-none opacity-70"
							lang="ja"
						>
							{unit.gloss}
						</rt>
						<rp>）</rp>
					</ruby>
				</button>
			</PopoverTrigger>
			<PopoverContent className="not-prose space-y-3">
				<div>
					<p className="m-0 text-base" lang="pi">
						{unit.surface}
					</p>
					<p className="m-0 mt-1 text-xs text-muted-foreground">語義</p>
					<p className="m-0" lang="ja">
						{unit.gloss}
					</p>
				</div>
				<div className="flex items-center justify-between border-t pt-2">
					<span className="text-xs text-muted-foreground">この語義を評価</span>
					<VoteButtons
						isVoting={votingGlossUnitId === unit.id}
						onVote={vote}
						voteTarget={unit}
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}
