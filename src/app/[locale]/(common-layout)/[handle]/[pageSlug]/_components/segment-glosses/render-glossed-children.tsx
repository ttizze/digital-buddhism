/* oxlint-disable anti-slop/no-runtime-typeof -- ReactNode is a framework-defined union; text primitives must be distinguished from elements without runtime schema parsing. */
import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import type { SegmentGlossUnit } from "@/app/api/segment-glosses/_domain/segment-glosses";
import { GlossUnit } from "./gloss-unit";

function textContent(node: ReactNode): string {
	let text = "";
	Children.forEach(node, (child) => {
		if (isValidElement<{ children?: ReactNode }>(child)) {
			text += textContent(child.props.children);
		} else if (typeof child === "string" || typeof child === "number") {
			text += String(child);
		}
	});
	return text;
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
	const transform = (nodes: ReactNode, canWrap: boolean): ReactNode =>
		Children.map(nodes, (node) => {
			if (isValidElement<{ children?: ReactNode }>(node)) {
				const isInteractiveElement =
					node.type === "a" || node.type === "button";
				return cloneElement(
					node,
					undefined,
					transform(node.props.children, canWrap && !isInteractiveElement),
				);
			}

			if (typeof node !== "string" && typeof node !== "number") return node;
			const text = String(node);
			const nodeStart = cursor;
			const nodeEnd = nodeStart + text.length;
			cursor = nodeEnd;
			if (!canWrap || text.length === 0) return node;

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
					parts.push(text.slice(localCursor, localStart));
				}
				parts.push(
					<GlossUnit key={unit.id} unit={unit}>
						{text.slice(localStart, localEnd)}
					</GlossUnit>,
				);
				localCursor = localEnd;
			}
			if (localCursor < text.length) parts.push(text.slice(localCursor));
			return parts;
		});

	return transform(children, true);
}
