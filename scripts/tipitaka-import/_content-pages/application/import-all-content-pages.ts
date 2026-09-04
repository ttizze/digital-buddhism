import { db } from "@/db";
import { parseDirSegment } from "../../domain/parse-dir-segment/parse-dir-segment";
import { createCliLogger } from "../../logger";
import type { TipitakaFileMeta } from "../../types";
import { BASE_DIR } from "../../utils/constants";
import { slugify } from "../../utils/slugify";
import {
	createContentIndexPage,
	createContentPage,
} from "../_pages/application/create-content-page";
import { assertNoBodyContributions } from "../_pages/application/migrate-segment-contributions";
import { getContentParts } from "../_pages/utils/get-file-path";
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
	catalogImportFileId: number,
): Promise<void> {
	const pagesByFileKey = new Map<
		string,
		Array<{ id: number; position: number }>
	>();
	const relationOwnerPageIds: number[] = [];
	const orderedFileMetas = [...fileMetas].sort((left, right) =>
		left.fileKey.localeCompare(right.fileKey),
	);
	const concurrency = resolveWriteConcurrency();

	for (let index = 0; index < orderedFileMetas.length; index += concurrency) {
		const batch = orderedFileMetas.slice(index, index + concurrency);
		const importedFiles = await Promise.all(
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
				const parts = getContentParts(fileMeta, BASE_DIR);
				const existingPage = await db
					.selectFrom("tipitakaPages")
					.select(["id", "textLevel"])
					.where("catalogKey", "=", slugify(`tipitaka-${fileMeta.fileKey}`))
					.executeTakeFirst();
				const contributionSourcePageId =
					parts.length > 1 &&
					existingPage !== undefined &&
					existingPage.textLevel !== null
						? existingPage.id
						: null;
				const contentParentId =
					parts.length === 1
						? parentId
						: contributionSourcePageId !== null
							? contributionSourcePageId
							: await createContentIndexPage({
									entry: fileMeta,
									parentId,
									position,
									importFileId: catalogImportFileId,
								});
				const pages: Array<{ id: number; position: number }> = [];
				for (const part of parts) {
					const pageId = await createContentPage({
						entry: fileMeta,
						part,
						pageFileKey: parts.length === 1 ? fileMeta.fileKey : part.fileKey,
						parentId: contentParentId,
						position: parts.length === 1 ? position : part.position,
						importRunId,
						contributionSourcePageId,
					});
					pages.push({ id: pageId, position: part.position });
				}

				if (parts.length === 1) {
					const contentPage = pages[0];
					if (!contentPage) {
						throw new Error(
							`Tipitaka content page is missing: ${fileMeta.fileKey}`,
						);
					}
					await db
						.deleteFrom("tipitakaPages")
						.where("parentId", "=", contentPage.id)
						.execute();
				} else {
					if (contributionSourcePageId !== null) {
						await assertNoBodyContributions(contributionSourcePageId);
						await createContentIndexPage({
							entry: fileMeta,
							parentId,
							position,
							importFileId: catalogImportFileId,
						});
					}
					await db
						.deleteFrom("tipitakaPages")
						.where("parentId", "=", contentParentId)
						.where(
							"id",
							"not in",
							pages.map((page) => page.id),
						)
						.execute();
				}

				return {
					fileKey: fileMeta.fileKey,
					pages,
					indexPageId: parts.length > 1 ? contentParentId : null,
				};
			}),
		);
		for (const importedFile of importedFiles) {
			pagesByFileKey.set(importedFile.fileKey, importedFile.pages);
			relationOwnerPageIds.push(...importedFile.pages.map((page) => page.id));
			if (importedFile.indexPageId !== null) {
				relationOwnerPageIds.push(importedFile.indexPageId);
			}
		}
	}

	const relations = await syncAnnotationRelations(
		fileMetas,
		pagesByFileKey,
		relationOwnerPageIds,
	);
	logger.info("Imported Tipitaka content pages and annotation relations", {
		contentPageCount: [...pagesByFileKey.values()].reduce(
			(count, pages) => count + pages.length,
			0,
		),
		...relations,
	});
}
