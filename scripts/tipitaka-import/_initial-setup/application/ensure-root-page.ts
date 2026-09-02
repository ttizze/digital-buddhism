import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { upsertPageAndSegments } from "../../application/upsert-page-and-segments";
import { ROOT_SLUG, ROOT_TITLE } from "../../utils/constants";

export async function ensureRootPage(): Promise<number> {
	const currentDir = path.dirname(fileURLToPath(import.meta.url));
	const readmePath = path.join(currentDir, "..", "..", "README.md");
	const markdownContent = await fs.readFile(readmePath, "utf-8");

	const parsed = await markdownToMdastWithSegments({
		header: ROOT_TITLE,
		markdown: markdownContent,
	});

	const page = await upsertPageAndSegments({
		catalogKey: ROOT_SLUG,
		pageSlug: ROOT_SLUG,
		mdastJson: parsed.mdastJson,
		textLevel: null,
		parentId: null,
		position: 0,
		importFileId: null,
		segments: parsed.segments,
	});

	return page.id;
}
