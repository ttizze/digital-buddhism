import type { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";
import type { PageStatus } from "@/drizzle/types";

// fetchPageDetail の戻り値から型を推論
export type PageDetail = NonNullable<
	Awaited<ReturnType<typeof fetchPageDetail>>
>;

export type SegmentWithSegmentType = {
	id: number;
	pageId: number;
	number: number;
	text: string;
	translationText: string | null;
	segmentTypeKey: string;
	segmentTypeLabel: string;
};
export type TitleSegment = Omit<
	SegmentWithSegmentType,
	"segmentTypeKey" | "segmentTypeLabel"
>;

export type SegmentForDetail = SegmentWithSegmentType & {
	annotations: Array<{
		annotationSegment: SegmentWithSegmentType;
	}>;
};

// 注釈は取得経路によって省略される場合がある
type SegmentWithOptionalAnnotations = Omit<SegmentForDetail, "annotations"> & {
	annotations?: SegmentForDetail["annotations"];
};
export type Segment =
	| SegmentForDetail
	| SegmentWithOptionalAnnotations
	| TitleSegment;

export type PageForList = {
	id: number;
	slug: string;
	createdAt: Date;
	status: PageStatus;
	userHandle: string;
	userName: string;
	userImage: string;
	titleSegment: TitleSegment;
};

export type PageForTree = {
	id: number;
	slug: string;
	parentId: number | null;
	order: number;
	userHandle: string;
	titleSegmentId: number;
	titleText: string;
	titleTranslationText: string | null;
};
