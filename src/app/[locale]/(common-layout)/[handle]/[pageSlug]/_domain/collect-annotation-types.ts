import type { PageDetail } from "@/app/[locale]/types";

export type AnnotationType = {
	key: string;
	label: string;
};

export function collectAnnotationTypes(
	segments: PageDetail["segments"],
): AnnotationType[] {
	const typeByLevel = new Map<string, AnnotationType>();
	for (const segment of segments) {
		for (const link of segment.annotations ?? []) {
			const { textLevel } = link.annotationSegment;
			if (!textLevel) continue;
			const label =
				textLevel.charAt(0) + textLevel.slice(1).toLocaleLowerCase();
			typeByLevel.set(textLevel, { key: textLevel, label });
		}
	}
	return Array.from(typeByLevel.values()).sort((left, right) =>
		left.label.localeCompare(right.label),
	);
}
