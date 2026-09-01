import type { JSX, ReactNode } from "react";
import { renderGlossedChildren } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/segment-glosses/render-glossed-children";
import type { Segment } from "@/app/[locale]/types";

type SegmentElementProps = {
	tagName?: keyof JSX.IntrinsicElements;
	segment: Segment;
	interactive?: boolean;
	className?: string;
	tagProps?: Record<string, unknown>;
	/** mdast経由の場合はネストされたReact要素を保持するために使用。なければsegment.textをパース */
	children?: ReactNode;
};

/** src/tr ペアを描画する共通コンポーネント */
function SegmentPair({
	tagName: Tag = "span",
	segment,
	interactive = true,
	className,
	tagProps,
	children,
}: SegmentElementProps) {
	const hasTr = segment.translationText != null;
	const sourceChildren = children ?? segment.text ?? "";
	const renderedSource =
		segment.glossUnits && segment.glossUnits.length > 0
			? renderGlossedChildren(
					sourceChildren,
					segment.text ?? "",
					segment.glossUnits,
				)
			: sourceChildren;

	return (
		<>
			<Tag
				{...tagProps}
				className={`${className} seg-src ${hasTr ? "seg-has-tr" : ""} ${children === undefined ? "whitespace-pre-wrap" : ""}`}
				data-number-id={segment.number}
			>
				{renderedSource}
			</Tag>
			{hasTr && (
				<Tag
					{...tagProps}
					className={`${className} seg-tr whitespace-pre-wrap break-words ${interactive ? "cursor-pointer select-text" : ""}`}
					data-number-id={segment.number}
					id={tagProps?.id ? `${tagProps.id}-tr` : undefined}
					{...(interactive && {
						role: "button",
						tabIndex: 0,
						"data-segment-id": segment.id,
					})}
				>
					{segment.translationText}
				</Tag>
			)}
		</>
	);
}

export function SegmentElement({
	tagName = "span",
	segment,
	interactive = true,
	className,
	tagProps,
	children,
}: SegmentElementProps) {
	const baseClassName = [tagProps?.className, className, "block seg-cv"]
		.filter(Boolean)
		.join(" ");

	const annotations =
		"annotations" in segment ? (segment.annotations ?? []) : [];

	return (
		<>
			<SegmentPair
				className={baseClassName}
				interactive={interactive}
				segment={segment}
				tagName={tagName}
				tagProps={tagProps}
			>
				{children}
			</SegmentPair>

			{annotations.map(({ annotationSegment }) => {
				const annotationType = annotationSegment.textLevel
					? annotationSegment.textLevel.charAt(0) +
						annotationSegment.textLevel.slice(1).toLocaleLowerCase()
					: "Other";
				return (
					<SegmentPair
						className={`${baseClassName} seg-ann hidden ml-4 text-sm leading-relaxed`}
						interactive={interactive}
						key={`ann-${annotationSegment.id}`}
						segment={annotationSegment}
						tagName={tagName}
						tagProps={{
							...tagProps,
							id: undefined,
							"data-annotation-type": annotationType,
						}}
					/>
				);
			})}
		</>
	);
}
