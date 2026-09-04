import type { TipitakaTextLevel } from "@/drizzle/types";

export interface LocatedSegment {
	id: number;
	pageId: number;
	number: number;
	sourceBookCode: string | null;
	sourceChapterNumber: number | null;
	sourceParagraphNumber: string | null;
	sourceParagraphOccurrence: number | null;
}

export interface AnnotationTargetPage {
	id: number;
	position: number;
	textLevel: TipitakaTextLevel;
	segments: LocatedSegment[];
}

export interface ResolvedAnnotationLinks {
	links: Array<{ targetSegmentId: number; annotationSegmentId: number }>;
	matchedParagraphGroups: number;
	unmatchedParagraphGroups: number;
}

interface ParagraphGroup {
	bookCode: string | null;
	paragraphNumber: string;
	chapterNumber: number | null;
	occurrence: number;
	segmentIds: number[];
}

interface TargetAnchor {
	pageId: number;
	bookCode: string | null;
	chapterNumber: number | null;
	paragraphNumber: string;
	segmentId: number;
}

interface TargetAnchors {
	anchors: TargetAnchor[];
	prefaceSegmentId: number | null;
	prefaceSegmentIdByBook: Map<string, number>;
	prefaceSegmentIdByPageAndBook: Map<string, number>;
}

function paragraphGroupKey(
	bookCode: string | null,
	paragraphNumber: string,
	occurrence: number,
): string {
	return `${bookCode ?? ""}\u0000${paragraphNumber}\u0000${occurrence}`;
}

function pageAndBookKey(pageId: number, bookCode: string): string {
	return `${pageId}\u0000${bookCode}`;
}

function groupSourceParagraphs(segments: LocatedSegment[]): ParagraphGroup[] {
	const groups = new Map<string, ParagraphGroup>();
	for (const segment of segments) {
		const paragraphNumber = segment.sourceParagraphNumber;
		const occurrence = segment.sourceParagraphOccurrence;
		if (paragraphNumber === null || occurrence === null) continue;
		const key = paragraphGroupKey(
			segment.sourceBookCode,
			paragraphNumber,
			occurrence,
		);
		const group = groups.get(key);
		if (group) {
			group.segmentIds.push(segment.id);
			continue;
		}
		groups.set(key, {
			bookCode: segment.sourceBookCode,
			chapterNumber: segment.sourceChapterNumber,
			paragraphNumber,
			occurrence,
			segmentIds: [segment.id],
		});
	}
	return [...groups.values()];
}

function buildTargetAnchors(
	targetPages: AnnotationTargetPage[],
): TargetAnchors {
	const anchors: TargetAnchor[] = [];
	const prefaceSegmentIdByBook = new Map<string, number>();
	const prefaceSegmentIdByPageAndBook = new Map<string, number>();
	const booksWithParagraphs = new Set<string>();
	let firstSegmentId: number | null = null;
	let prefaceSegmentId: number | null = null;
	let hasParagraph = false;

	for (const page of targetPages) {
		const groups = new Map<string, LocatedSegment[]>();
		const pageBooksWithParagraphs = new Set<string>();
		for (const segment of page.segments) {
			firstSegmentId ??= segment.id;
			if (segment.sourceParagraphNumber !== null) {
				hasParagraph = true;
				if (segment.sourceBookCode) {
					booksWithParagraphs.add(segment.sourceBookCode);
					pageBooksWithParagraphs.add(segment.sourceBookCode);
				}
			} else {
				if (!hasParagraph) prefaceSegmentId = segment.id;
				if (
					segment.sourceBookCode &&
					!booksWithParagraphs.has(segment.sourceBookCode)
				) {
					prefaceSegmentIdByBook.set(segment.sourceBookCode, segment.id);
				}
				if (
					segment.sourceBookCode &&
					!pageBooksWithParagraphs.has(segment.sourceBookCode)
				) {
					prefaceSegmentIdByPageAndBook.set(
						pageAndBookKey(page.id, segment.sourceBookCode),
						segment.id,
					);
				}
			}
			const paragraphNumber = segment.sourceParagraphNumber;
			const occurrence = segment.sourceParagraphOccurrence;
			if (paragraphNumber === null || occurrence === null) continue;
			const key = paragraphGroupKey(
				segment.sourceBookCode,
				paragraphNumber,
				occurrence,
			);
			const candidates = groups.get(key) ?? [];
			candidates.push(segment);
			groups.set(key, candidates);
		}
		for (const group of groups.values()) {
			const first = group[0];
			const last = group[group.length - 1];
			if (!first || !last || first.sourceParagraphNumber === null) continue;
			anchors.push({
				pageId: page.id,
				bookCode: first.sourceBookCode,
				chapterNumber: first.sourceChapterNumber,
				paragraphNumber: first.sourceParagraphNumber,
				segmentId: last.id,
			});
		}
	}
	return {
		anchors,
		prefaceSegmentId: prefaceSegmentId ?? firstSegmentId,
		prefaceSegmentIdByBook,
		prefaceSegmentIdByPageAndBook,
	};
}

function parseParagraphNumber(value: string): number | null {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function findTargetAnchor(
	group: ParagraphGroup,
	anchors: TargetAnchor[],
): TargetAnchor | null {
	const hasSameBook =
		group.bookCode !== null &&
		anchors.some((anchor) => anchor.bookCode === group.bookCode);
	let exact: TargetAnchor | null = null;
	let chapterExact: TargetAnchor | null = null;
	for (const anchor of anchors) {
		if (hasSameBook && anchor.bookCode !== group.bookCode) continue;
		if (anchor.paragraphNumber !== group.paragraphNumber) continue;
		exact = anchor;
		if (
			group.chapterNumber !== null &&
			anchor.chapterNumber === group.chapterNumber
		) {
			chapterExact = anchor;
		}
	}
	if (chapterExact) return chapterExact;
	if (exact) return exact;

	const sourceNumber = parseParagraphNumber(group.paragraphNumber);
	if (sourceNumber === null) return null;
	let previous: TargetAnchor | null = null;
	let previousNumber = -1;
	for (const anchor of anchors) {
		if (hasSameBook && anchor.bookCode !== group.bookCode) continue;
		const targetNumber = parseParagraphNumber(anchor.paragraphNumber);
		if (
			targetNumber !== null &&
			targetNumber <= sourceNumber &&
			targetNumber >= previousNumber
		) {
			previous = anchor;
			previousNumber = targetNumber;
		}
	}
	return previous;
}

function collectPrefaceSegmentIds(
	segments: LocatedSegment[],
): Map<string, number[]> {
	const prefaceByBook = new Map<string, number[]>();
	const seenParagraphByBook = new Set<string>();
	for (const segment of segments) {
		const bookCode = segment.sourceBookCode ?? "";
		if (segment.sourceParagraphNumber !== null) {
			seenParagraphByBook.add(bookCode);
			continue;
		}
		if (seenParagraphByBook.has(bookCode)) continue;
		const ids = prefaceByBook.get(bookCode) ?? [];
		ids.push(segment.id);
		prefaceByBook.set(bookCode, ids);
	}
	return prefaceByBook;
}

/**
 * Resolves book- and chapter-qualified anchors for inline display. The last
 * duplicate within the matching chapter preserves the established placement
 * after repeated target passages. Without a chapter-qualified exact target,
 * resolution uses the last book-scoped exact target, then the nearest previous
 * paragraph. Occurrence keeps repeated source groups distinct.
 */
export function resolveAnnotationLinks(
	sourceSegments: LocatedSegment[],
	targetPages: AnnotationTargetPage[],
): ResolvedAnnotationLinks {
	const orderedSource = [...sourceSegments].sort(
		(left, right) => left.number - right.number || left.id - right.id,
	);
	const orderedTargets = [...targetPages]
		.sort((left, right) => left.position - right.position || left.id - right.id)
		.map((page) => ({
			...page,
			segments: [...page.segments].sort(
				(left, right) => left.number - right.number || left.id - right.id,
			),
		}));
	const {
		anchors,
		prefaceSegmentId,
		prefaceSegmentIdByBook,
		prefaceSegmentIdByPageAndBook,
	} = buildTargetAnchors(orderedTargets);
	const links: ResolvedAnnotationLinks["links"] = [];
	const seenLinks = new Set<string>();
	const firstMatchedAnchorByBook = new Map<string, TargetAnchor>();
	let matchedParagraphGroups = 0;
	let unmatchedParagraphGroups = 0;

	const appendLinks = (
		targetSegmentId: number,
		annotationSegmentIds: number[],
	) => {
		for (const annotationSegmentId of annotationSegmentIds) {
			if (targetSegmentId === annotationSegmentId) continue;
			const key = `${targetSegmentId}:${annotationSegmentId}`;
			if (seenLinks.has(key)) continue;
			seenLinks.add(key);
			links.push({ targetSegmentId, annotationSegmentId });
		}
	};

	for (const group of groupSourceParagraphs(orderedSource)) {
		const anchor = findTargetAnchor(group, anchors);
		if (!anchor) {
			unmatchedParagraphGroups += 1;
			continue;
		}
		matchedParagraphGroups += 1;
		const bookCode = group.bookCode ?? "";
		if (!firstMatchedAnchorByBook.has(bookCode)) {
			firstMatchedAnchorByBook.set(bookCode, anchor);
		}
		appendLinks(anchor.segmentId, group.segmentIds);
	}

	for (const [bookCode, annotationSegmentIds] of collectPrefaceSegmentIds(
		orderedSource,
	)) {
		const matchedAnchor = firstMatchedAnchorByBook.get(bookCode);
		const targetSegmentId =
			(matchedAnchor && bookCode
				? prefaceSegmentIdByPageAndBook.get(
						pageAndBookKey(matchedAnchor.pageId, bookCode),
					)
				: null) ??
			matchedAnchor?.segmentId ??
			(bookCode ? prefaceSegmentIdByBook.get(bookCode) : null) ??
			prefaceSegmentId;
		if (targetSegmentId !== null && targetSegmentId !== undefined) {
			appendLinks(targetSegmentId, annotationSegmentIds);
		}
	}

	return { links, matchedParagraphGroups, unmatchedParagraphGroups };
}
