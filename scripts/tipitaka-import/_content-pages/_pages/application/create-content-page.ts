import fs from "node:fs/promises";
import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "../../../application/upsert-page-and-segments";
import { parseDirSegment } from "../../../domain/parse-dir-segment/parse-dir-segment";
import type { TipitakaFileMeta } from "../../../types";
import { slugify } from "../../../utils/slugify";
import { findSegmentTypeIdForTipitakaPrimaryOrCommentary } from "../_find-segment-type-id/application/find-segment-type-id";
import { findTipitakaPageBySlug } from "../db/pages";
import { removeHeader } from "../domain/remove-header";
import { getFilePath } from "../utils/get-file-path";

interface ContentPageParams {
	entry: TipitakaFileMeta;
	parentId: number;
	position: number;
	anchorPageId: number | null;
}

export async function createContentPage({
	entry: tipitakaFileMeta,
	parentId,
	position,
	anchorPageId,
}: ContentPageParams): Promise<number> {
	const filePath = getFilePath(tipitakaFileMeta);
	const raw = await fs.readFile(filePath, "utf8");
	const { body } = removeHeader(raw);
	const lastSegment =
		tipitakaFileMeta.dirSegments[tipitakaFileMeta.dirSegments.length - 1];
	const { title } = parseDirSegment(lastSegment);

	const { mdastJson, segments } = await markdownToMdastWithSegments({
		header: title,
		markdown: body,
	});

	const slug = slugify(`tipitaka-${tipitakaFileMeta.fileKey}`);

	const normalizedKind = tipitakaFileMeta.primaryOrCommentary.toUpperCase();
	const kind =
		normalizedKind === "MULA" || normalizedKind === "OTHER"
			? "TEXT"
			: "COMMENTARY";
	const segmentTypeId = await findSegmentTypeIdForTipitakaPrimaryOrCommentary(
		tipitakaFileMeta.primaryOrCommentary,
	);

	await upsertPageAndSegments({
		pageSlug: slug,
		mdastJson,
		kind,
		parentId,
		position,
		isVisible: true,
		segments,
		segmentTypeId,
		anchorPageId,
	});

	const page = await findTipitakaPageBySlug(slug);

	return page.id;
}
