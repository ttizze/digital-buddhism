import type { TipitakaTextLevel } from "@/drizzle/types";
import * as v from "valibot";
import { withImportFile } from "../application/import-tracking";
import type { TipitakaFileMeta } from "../types";
import { BOOKS_JSON_PATH } from "./constants";

const textLevelSchema = v.picklist(["MULA", "ATTHAKATHA", "TIKA", "OTHER"]);
const booksJsonSchema = v.object({
	generatedAt: v.string(),
	count: v.number(),
	data: v.record(
		v.string(),
		v.object({
			level: v.string(),
			dirSegments: v.array(v.string()),
			annotationTargetFileNames: v.array(v.string()),
			chapterListTypes: v.optional(v.array(v.string())),
		}),
	),
});

function parseTextLevel(level: string, fileKey: string): TipitakaTextLevel {
	const result = v.safeParse(textLevelSchema, level.toUpperCase());
	if (!result.success) {
		throw new Error(`Unknown text level for ${fileKey}: ${level}`);
	}
	return result.output;
}

export function parseBooksJson(raw: string): TipitakaFileMeta[] {
	const payload = v.parse(booksJsonSchema, JSON.parse(raw));
	const knownFileKeys = new Set(Object.keys(payload.data));
	const parsedEntries = Object.entries(payload.data).map(([fileKey, meta]) => ({
		fileKey,
		meta,
		textLevel: parseTextLevel(meta.level, fileKey),
	}));
	const textLevelByFileKey = new Map(
		parsedEntries.map(({ fileKey, textLevel }) => [fileKey, textLevel]),
	);
	const tipitakaFileMetas = parsedEntries.map(
		({ fileKey, meta, textLevel }): TipitakaFileMeta => {
			for (const targetFileKey of meta.annotationTargetFileNames) {
				if (!knownFileKeys.has(targetFileKey)) {
					throw new Error(
						`Unknown annotation target for ${fileKey}: ${targetFileKey}`,
					);
				}
			}
			return {
				fileKey,
				textLevel,
				dirSegments: meta.dirSegments,
				annotationTargetFileKeys: meta.annotationTargetFileNames,
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
