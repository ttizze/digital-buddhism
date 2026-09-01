import type { ReactNode } from "react";
import type { SegmentWordWithGloss } from "@/app/api/segment-glosses/_domain/word-glosses";

export function GlossUnit({
	children,
	unit,
}: {
	children: ReactNode;
	unit: SegmentWordWithGloss;
}) {
	return (
		<button
			aria-label={`${unit.surface}の翻訳「${unit.gloss.text}」を表示`}
			className="inline cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 [color:inherit] [font:inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			data-word-id={unit.id}
			type="button"
		>
			<ruby className="whitespace-nowrap [ruby-position:over]">
				{children}
				<rp>（</rp>
				<rt
					className="select-none text-[0.55em] leading-none text-foreground"
					lang="ja"
				>
					{unit.gloss.text}
				</rt>
				<rp>）</rp>
			</ruby>
		</button>
	);
}
