import type { TipitakaTextLevel } from "@/drizzle/types";
import { withImportFile } from "../application/import-tracking";
import type { TipitakaFileMeta } from "../types";
import { BOOKS_JSON_PATH } from "./constants";

interface BooksJsonPayload {
	generatedAt: string;
	count: number;
	data: Record<string, BookMeta>;
}

interface BookMeta {
	level: string;
	dirSegments: string[];
	annotationTargetFileNames: string[];
	chapterListTypes?: string[];
}

const TEXT_LEVELS = new Set<TipitakaTextLevel>([
	"MULA",
	"ATTHAKATHA",
	"TIKA",
	"OTHER",
]);

function parseTextLevel(level: string, fileKey: string): TipitakaTextLevel {
	const normalized = level.toUpperCase() as TipitakaTextLevel;
	if (!TEXT_LEVELS.has(normalized)) {
		throw new Error(`Unknown text level for ${fileKey}: ${level}`);
	}
	return normalized;
}

export function parseBooksJson(raw: string): TipitakaFileMeta[] {
	const payload = JSON.parse(raw) as BooksJsonPayload;
	const knownFileKeys = new Set(Object.keys(payload.data));
	const textLevelByFileKey = new Map(
		Object.entries(payload.data).map(([fileKey, meta]) => [
			fileKey,
			parseTextLevel(meta.level, fileKey),
		]),
	);
	const tipitakaFileMetas = Object.entries(payload.data).map(
		([fileKey, meta]): TipitakaFileMeta => {
			for (const targetFileKey of meta.annotationTargetFileNames) {
				if (!knownFileKeys.has(targetFileKey)) {
					throw new Error(
						`Unknown annotation target for ${fileKey}: ${targetFileKey}`,
					);
				}
			}
			return {
				fileKey,
				textLevel: textLevelByFileKey.get(fileKey) as TipitakaTextLevel,
				dirSegments: [...meta.dirSegments],
				annotationTargetFileKeys: [...meta.annotationTargetFileNames],
			};
		},
	);

	for (const fileMeta of tipitakaFileMetas) {
		const seenTargets = new Set<string>();
		for (const targetFileKey of fileMeta.annotationTargetFileKeys) {
			if (
				targetFileKey === fileMeta.fileKey ||
				seenTargets.has(targetFileKey)
			) {
				throw new Error(
					`Invalid duplicate or self annotation target: ${fileMeta.fileKey} -> ${targetFileKey}`,
				);
			}
			seenTargets.add(targetFileKey);
			const targetLevel = textLevelByFileKey.get(targetFileKey);
			const validTarget =
				(fileMeta.textLevel === "ATTHAKATHA" && targetLevel === "MULA") ||
				(fileMeta.textLevel === "TIKA" &&
					(targetLevel === "MULA" || targetLevel === "ATTHAKATHA"));
			if (!validTarget) {
				throw new Error(
					`Invalid annotation level relation: ${fileMeta.fileKey} (${fileMeta.textLevel}) -> ${targetFileKey} (${targetLevel})`,
				);
			}
		}
	}

	if (tipitakaFileMetas.length !== payload.count) {
		throw new Error(
			`books.json count mismatch: expected ${payload.count}, got ${tipitakaFileMetas.length}`,
		);
	}
	return tipitakaFileMetas;
}

export async function readBooksJson(importRunId: number): Promise<{
	tipitakaFileMetas: TipitakaFileMeta[];
	importFileId: number;
}> {
	return withImportFile({
		importRunId,
		filePath: BOOKS_JSON_PATH,
		operation: async (importFileId, raw) => ({
			tipitakaFileMetas: parseBooksJson(raw.toString("utf8")),
			importFileId,
		}),
	});
}
