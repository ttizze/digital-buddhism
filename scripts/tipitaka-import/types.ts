import type { TipitakaTextLevel } from "@/drizzle/types";

export interface TipitakaFileMeta {
	fileKey: string;
	textLevel: TipitakaTextLevel;
	dirSegments: string[];
	annotationTargetFileKeys: string[];
}
