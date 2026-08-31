import type { SegmentGlossUnit } from "@/app/api/segment-glosses/_domain/segment-glosses";
import type { JsonValue, TipitakaTextLevel } from "@/drizzle/types";

export type SegmentForPage = {
	id: number;
	pageId: number;
	number: number;
	text: string;
	translationText: string | null;
	textLevel: TipitakaTextLevel | null;
	glossUnits?: SegmentGlossUnit[];
};

export type TitleSegment = Omit<SegmentForPage, "textLevel">;

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
	textLevel: TipitakaTextLevel | null;
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
	textLevel: TipitakaTextLevel | null;
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
