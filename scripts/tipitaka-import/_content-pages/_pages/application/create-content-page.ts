import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { withImportFile } from "../../../application/import-tracking";
import { upsertPageAndSegments } from "../../../application/upsert-page-and-segments";
import { parseDirSegment } from "../../../domain/parse-dir-segment/parse-dir-segment";
import type { TipitakaFileMeta } from "../../../types";
import { slugify } from "../../../utils/slugify";
import { findTipitakaPageBySlug } from "../db/pages";
import { removeHeader } from "../domain/remove-header";
import { getFilePath } from "../utils/get-file-path";

interface ContentPageParams {
	entry: TipitakaFileMeta;
	parentId: number;
	position: number;
	importRunId: number;
}

export async function createContentPage({
	entry,
	parentId,
	position,
	importRunId,
}: ContentPageParams): Promise<number> {
	const filePath = getFilePath(entry);

	return withImportFile({
		importRunId,
		filePath,
		operation: async (importFileId, raw) => {
			const { body } = removeHeader(raw.toString("utf8"));
			const lastSegment = entry.dirSegments[entry.dirSegments.length - 1];
			const { title } = parseDirSegment(lastSegment);
			const { mdastJson, segments } = await markdownToMdastWithSegments({
				header: title,
				markdown: body,
				autoUploadImages: false,
			});
			const slug = slugify(`tipitaka-${entry.fileKey}`);

			await upsertPageAndSegments({
				catalogKey: slug,
				pageSlug: slug,
				mdastJson,
				textLevel: entry.textLevel,
				parentId,
				position,
				importFileId,
				segments,
			});
			return (await findTipitakaPageBySlug(slug)).id;
		},
	});
}
