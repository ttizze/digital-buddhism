import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { withImportFile } from "../../../application/import-tracking";
import { upsertPageAndSegments } from "../../../application/upsert-page-and-segments";
import { parseDirSegment } from "../../../domain/parse-dir-segment/parse-dir-segment";
import type { TipitakaFileMeta } from "../../../types";
import { slugify } from "../../../utils/slugify";
import { removeHeader } from "../domain/remove-header";
import type { TipitakaContentPart } from "../utils/get-file-path";
import { migrateSegmentContributions } from "./migrate-segment-contributions";

interface ContentPageParams {
	entry: TipitakaFileMeta;
	part: TipitakaContentPart;
	pageFileKey: string;
	parentId: number;
	position: number;
	importRunId: number;
	contributionSourcePageId: number | null;
}

export async function createContentPage({
	entry,
	part,
	pageFileKey,
	parentId,
	position,
	importRunId,
	contributionSourcePageId,
}: ContentPageParams): Promise<number> {
	return withImportFile({
		importRunId,
		filePath: part.filePath,
		operation: async (importFileId, raw) => {
			const { header, body } = removeHeader(raw.toString("utf8"));
			const { mdastJson, segments } = await markdownToMdastWithSegments({
				header,
				markdown: body,
			});
			const slug = slugify(`tipitaka-${pageFileKey}`);

			const page = await upsertPageAndSegments({
				catalogKey: slug,
				pageSlug: slug,
				mdastJson,
				textLevel: entry.textLevel,
				parentId,
				position,
				importFileId,
				segments,
			});
			if (contributionSourcePageId !== null) {
				await migrateSegmentContributions(contributionSourcePageId, page.id);
			}
			return page.id;
		},
	});
}

export async function createContentIndexPage({
	entry,
	parentId,
	position,
	importFileId,
}: {
	entry: TipitakaFileMeta;
	parentId: number;
	position: number;
	importFileId: number;
}): Promise<number> {
	const lastSegment = entry.dirSegments.at(-1);
	if (!lastSegment) {
		throw new Error(`Tipitaka page has no directory path: ${entry.fileKey}`);
	}
	const { title } = parseDirSegment(lastSegment);
	const { mdastJson, segments } = await markdownToMdastWithSegments({
		header: title,
		markdown: "",
	});
	const slug = slugify(`tipitaka-${entry.fileKey}`);
	const page = await upsertPageAndSegments({
		catalogKey: slug,
		pageSlug: slug,
		mdastJson,
		textLevel: null,
		parentId,
		position,
		importFileId,
		segments,
	});
	return page.id;
}
