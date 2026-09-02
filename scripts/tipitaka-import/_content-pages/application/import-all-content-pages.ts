import { parseDirSegment } from "../../domain/parse-dir-segment/parse-dir-segment";
import { createCliLogger } from "../../logger";
import type { TipitakaFileMeta } from "../../types";
import { createContentPage } from "../_pages/application/create-content-page";
import { syncAnnotationRelations } from "./sync-annotation-relations";

const logger = createCliLogger("tipitaka-import");
const REMOTE_CONCURRENCY = 10;

function resolveWriteConcurrency(): number {
	const databaseUrl = process.env.TURSO_DATABASE_URL;
	if (!databaseUrl) return REMOTE_CONCURRENCY;
	const parsedUrl = new URL(databaseUrl);
	return parsedUrl.protocol === "http:" &&
		(parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost")
		? 1
		: REMOTE_CONCURRENCY;
}

export async function importAllContentPages(
	fileMetas: TipitakaFileMeta[],
	categoryPageLookup: Map<string, number>,
	rootPageId: number,
	importRunId: number,
): Promise<void> {
	const pageIdByFileKey = new Map<string, number>();
	const orderedFileMetas = [...fileMetas].sort((left, right) =>
		left.fileKey.localeCompare(right.fileKey),
	);
	const concurrency = resolveWriteConcurrency();

	for (let index = 0; index < orderedFileMetas.length; index += concurrency) {
		const batch = orderedFileMetas.slice(index, index + concurrency);
		const importedPages = await Promise.all(
			batch.map(async (fileMeta) => {
				const parentPath = fileMeta.dirSegments.slice(0, -1).join("/");
				const parentId = categoryPageLookup.get(parentPath) ?? rootPageId;
				const lastSegment = fileMeta.dirSegments.at(-1);
				if (!lastSegment) {
					throw new Error(
						`Tipitaka page has no directory path: ${fileMeta.fileKey}`,
					);
				}
				const { order: position } = parseDirSegment(lastSegment);
				const pageId = await createContentPage({
					entry: fileMeta,
					parentId,
					position,
					importRunId,
				});
				return { fileKey: fileMeta.fileKey, pageId };
			}),
		);
		for (const importedPage of importedPages) {
			pageIdByFileKey.set(importedPage.fileKey, importedPage.pageId);
		}
	}

	const relations = await syncAnnotationRelations(fileMetas, pageIdByFileKey);
	logger.info("Imported Tipitaka content pages and annotation relations", {
		contentPageCount: pageIdByFileKey.size,
		...relations,
	});
}
