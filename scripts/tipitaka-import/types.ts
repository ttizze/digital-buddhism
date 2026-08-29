export interface TipitakaFileMeta {
	fileKey: string;
	primaryOrCommentary: string; // "Mula" | "Atthakatha" | "Tika" | "Other"
	dirSegments: string[];
	mulaFileKey: string | null;
}
