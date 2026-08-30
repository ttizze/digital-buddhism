import type {
	JsonValue,
	SegmentTypeKey,
	TipitakaPageKind,
} from "@/drizzle/types";

export type SegmentForPage = {
	id: number;
	pageId: number;
	number: number;
	text: string;
	translationText: string | null;
	segmentTypeKey: SegmentTypeKey;
	segmentTypeLabel: string;
};

export type TitleSegment = Omit<
	SegmentForPage,
	"segmentTypeKey" | "segmentTypeLabel"
>;

export type SegmentForDetail = SegmentForPage & {
	annotations: Array<{
		annotationSegment: SegmentForPage;
	}>;
};

export type Segment =
	| SegmentForDetail
	| (Omit<SegmentForDetail, "annotations"> & {
			annotations?: SegmentForDetail["annotations"];
	  })
	| TitleSegment;

export type PageDetail = {
	id: number;
	slug: string;
	title: string;
	kind: TipitakaPageKind;
	parentId: number | null;
	position: number;
	mdastJson: JsonValue;
	segments: SegmentForDetail[];
	createdAt: Date;
	updatedAt: Date;
};

export type PageForList = {
	id: number;
	slug: string;
	createdAt: Date;
	kind: TipitakaPageKind;
	titleSegment: TitleSegment;
};

export type PageForTree = {
	id: number;
	slug: string;
	parentId: number | null;
	position: number;
	titleSegmentId: number;
	titleText: string;
	titleTranslationText: string | null;
};
