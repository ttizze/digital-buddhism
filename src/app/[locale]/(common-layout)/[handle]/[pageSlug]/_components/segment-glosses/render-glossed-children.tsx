import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import type { SegmentGlossUnit } from "@/app/api/segment-glosses/_domain/segment-glosses";
import { GlossUnit } from "./gloss-unit";

function textContent(node: ReactNode): string {
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (!isValidElement<{ children?: ReactNode }>(node)) {
		let text = "";
		Children.forEach(node, (child) => {
			text += textContent(child);
		});
		return text;
	}
	return textContent(node.props.children);
}

function validGlossUnits(
	sourceText: string,
	units: SegmentGlossUnit[],
): SegmentGlossUnit[] | null {
	const ordered = [...units].sort(
		(a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset,
	);
	let previousEnd = 0;
	for (const unit of ordered) {
		if (
			unit.startOffset < previousEnd ||
			unit.startOffset < 0 ||
			unit.endOffset > sourceText.length ||
			unit.endOffset <= unit.startOffset ||
			sourceText.slice(unit.startOffset, unit.endOffset) !== unit.surface
		) {
			return null;
		}
		previousEnd = unit.endOffset;
	}
	return ordered;
}

/** 既存の要素構造を保ち、同一テキストノード内の語義範囲だけを包む。 */
export function renderGlossedChildren(
	children: ReactNode,
	sourceText: string,
	units: SegmentGlossUnit[],
): ReactNode {
	const ordered = validGlossUnits(sourceText, units);
	if (!ordered || textContent(children) !== sourceText) return children;

	let cursor = 0;
	const transform = (node: ReactNode, canWrap: boolean): ReactNode => {
		if (typeof node === "number") {
			const text = String(node);
			cursor += text.length;
			return node;
		}
		if (typeof node === "string") {
			const nodeStart = cursor;
			const nodeEnd = nodeStart + node.length;
			cursor = nodeEnd;
			if (!canWrap) return node;

			const contained = ordered.filter(
				(unit) => unit.startOffset >= nodeStart && unit.endOffset <= nodeEnd,
			);
			if (contained.length === 0) return node;

			const parts: ReactNode[] = [];
			let localCursor = 0;
			for (const unit of contained) {
				const localStart = unit.startOffset - nodeStart;
				const localEnd = unit.endOffset - nodeStart;
				if (localStart > localCursor) {
					parts.push(node.slice(localCursor, localStart));
				}
				parts.push(
					<GlossUnit key={unit.id} unit={unit}>
						{node.slice(localStart, localEnd)}
					</GlossUnit>,
				);
				localCursor = localEnd;
			}
			if (localCursor < node.length) parts.push(node.slice(localCursor));
			return parts;
		}
		if (!isValidElement<{ children?: ReactNode }>(node)) {
			return Children.map(node, (child) => transform(child, canWrap));
		}

		const isInteractiveElement = node.type === "a" || node.type === "button";
		return cloneElement(
			node,
			undefined,
			Children.map(node.props.children, (child) =>
				transform(child, canWrap && !isInteractiveElement),
			),
		);
	};

	return Children.map(children, (child) => transform(child, true));
}
