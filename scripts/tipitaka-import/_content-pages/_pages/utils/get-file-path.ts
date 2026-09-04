import fs from "node:fs";
import path from "node:path";
import type { TipitakaFileMeta } from "../../../types";

export interface TipitakaContentPart {
	fileKey: string;
	filePath: string;
	position: number;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getContentParts(
	tipitakaFileMeta: TipitakaFileMeta,
	baseDirectory: string,
): TipitakaContentPart[] {
	const directory = path.join(baseDirectory, ...tipitakaFileMeta.dirSegments);
	const extension = path.extname(tipitakaFileMeta.fileKey);
	const stem = path.basename(tipitakaFileMeta.fileKey, extension);
	const singleFileName = `${stem}.md`;
	const numberedPattern = new RegExp(`^${escapeRegExp(stem)}(\\d+)\\.md$`);
	const entries = fs.readdirSync(directory);
	const hasSingleFile = entries.includes(singleFileName);
	const numberedParts = entries.flatMap((fileName) => {
		const match = fileName.match(numberedPattern);
		if (!match) return [];
		return [{ fileName, sourcePosition: Number.parseInt(match[1] ?? "", 10) }];
	});

	if (hasSingleFile && numberedParts.length > 0) {
		throw new Error(`Mixed split and unsplit Tipitaka output: ${stem}`);
	}
	if (hasSingleFile) {
		return [
			{
				fileKey: tipitakaFileMeta.fileKey,
				filePath: path.join(directory, singleFileName),
				position: 0,
			},
		];
	}

	numberedParts.sort(
		(left, right) => left.sourcePosition - right.sourcePosition,
	);
	const firstSourcePosition = numberedParts[0]?.sourcePosition;
	if (firstSourcePosition === undefined) {
		throw new Error(`No converted Tipitaka content found: ${stem}`);
	}
	for (const [position, part] of numberedParts.entries()) {
		if (part.sourcePosition !== firstSourcePosition + position) {
			throw new Error(`Non-contiguous Tipitaka.org parts: ${stem}`);
		}
	}

	return numberedParts.map((part, position) => ({
		fileKey: `${path.basename(part.fileName, path.extname(part.fileName))}${extension}`,
		filePath: path.join(directory, part.fileName),
		position,
	}));
}
