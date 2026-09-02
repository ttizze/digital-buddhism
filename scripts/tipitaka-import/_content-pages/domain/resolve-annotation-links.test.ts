import { describe, expect, test } from "vite-plus/test";
import type { TipitakaTextLevel } from "@/drizzle/types";
import {
	type AnnotationTargetPage,
	type LocatedSegment,
	resolveAnnotationLinks,
} from "./resolve-annotation-links";

const segment = (
	id: number,
	pageId: number,
	number: number,
	bookCode: string | null,
	paragraphNumber: string | null,
	occurrence: number | null,
	chapterNumber: number | null = null,
): LocatedSegment => ({
	id,
	pageId,
	number,
	sourceBookCode: bookCode,
	sourceChapterNumber: chapterNumber,
	sourceParagraphNumber: paragraphNumber,
	sourceParagraphOccurrence: occurrence,
});

const targetPage = (
	id: number,
	position: number,
	segments: LocatedSegment[],
): AnnotationTargetPage => ({
	id,
	position,
	textLevel: "MULA" satisfies TipitakaTextLevel,
	segments,
});

describe("resolveAnnotationLinks", () => {
	test("uses book scope and the last duplicate paragraph anchor", () => {
		const source = [
			segment(100, 10, 0, "an2", null, null),
			segment(101, 10, 1, "an2", "1", 1),
			segment(102, 10, 2, "an2", "1", 2),
			segment(103, 10, 3, "an3", "1", 1),
		];
		const targets = [
			targetPage(20, 0, [
				segment(200, 20, 0, "an2", null, null),
				segment(205, 20, 1, "an2", null, null),
				segment(201, 20, 2, "an2", "1", 1),
				segment(202, 20, 3, "an2", "1", 1),
				segment(203, 20, 4, "an2", "1", 2),
				segment(204, 20, 5, "an3", "1", 1),
			]),
		];

		expect(resolveAnnotationLinks(source, targets)).toEqual({
			links: [
				{ targetSegmentId: 203, annotationSegmentId: 101 },
				{ targetSegmentId: 203, annotationSegmentId: 102 },
				{ targetSegmentId: 204, annotationSegmentId: 103 },
				{ targetSegmentId: 205, annotationSegmentId: 100 },
			],
			matchedParagraphGroups: 3,
			unmatchedParagraphGroups: 0,
		});
	});

	test("uses the last duplicate anchor within the matching chapter", () => {
		const source = [segment(100, 10, 0, "an2", "1", 1, 1)];
		const targets = [
			targetPage(20, 0, [
				segment(201, 20, 0, "an2", "1", 1, 1),
				segment(202, 20, 1, "an2", "1", 2, 1),
				segment(203, 20, 2, "an2", "1", 3, 2),
			]),
		];

		expect(resolveAnnotationLinks(source, targets)).toEqual({
			links: [{ targetSegmentId: 202, annotationSegmentId: 100 }],
			matchedParagraphGroups: 1,
			unmatchedParagraphGroups: 0,
		});
	});

	test("falls back to the nearest previous paragraph", () => {
		const source = [segment(100, 10, 0, null, "12", 1)];
		const targets = [
			targetPage(20, 0, [
				segment(201, 20, 0, null, "8", 1),
				segment(202, 20, 1, null, "10", 1),
				segment(203, 20, 2, null, "15", 1),
			]),
		];

		expect(resolveAnnotationLinks(source, targets)).toEqual({
			links: [{ targetSegmentId: 202, annotationSegmentId: 100 }],
			matchedParagraphGroups: 1,
			unmatchedParagraphGroups: 0,
		});
	});

	test("reports a paragraph before the first target anchor as unmatched", () => {
		const source = [segment(100, 10, 0, null, "3", 1)];
		const targets = [targetPage(20, 0, [segment(201, 20, 0, null, "8", 1)])];

		expect(resolveAnnotationLinks(source, targets)).toEqual({
			links: [],
			matchedParagraphGroups: 0,
			unmatchedParagraphGroups: 1,
		});
	});
});
