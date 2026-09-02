import type { AriaRole, ReactNode } from "react";
import { renderGlossedChildren } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/segment-glosses/render-glossed-children";
import type { Segment } from "@/app/[locale]/types";

export type SegmentTag =
	| "span"
	| "p"
	| "h1"
	| "h2"
	| "h3"
	| "h4"
	| "h5"
	| "h6"
	| "li";

export interface SegmentTagProps {
	className?: string;
	id?: string;
	role?: AriaRole;
	start?: number;
	tabIndex?: number;
	"data-annotation-type"?: string;
	"data-number-id"?: number | string;
	"data-segment-id"?: number;
}

type SegmentElementProps = {
	tagName?: SegmentTag;
	segment: Segment;
	interactive?: boolean;
	className?: string;
	tagProps?: SegmentTagProps;
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
	const tagId = tagProps?.id;
	const translationProps: SegmentTagProps = { ...tagProps };
	if (interactive) {
		translationProps.role = "button";
		translationProps.tabIndex = 0;
		translationProps["data-segment-id"] = segment.id;
	}

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
					{...translationProps}
					className={`${className} seg-tr whitespace-pre-wrap break-words ${interactive ? "cursor-pointer select-text" : ""}`}
					data-number-id={segment.number}
					id={tagId ? `${tagId}-tr` : undefined}
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
