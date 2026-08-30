import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { db } from "@/db";
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

	await upsertPageAndSegments({
		pageSlug: ROOT_SLUG,
		mdastJson: parsed.mdastJson,
		kind: "ROOT",
		parentId: null,
		position: 0,
		isVisible: true,
		segments: parsed.segments,
		segmentTypeId: null,
		anchorPageId: null,
	});

	const page = await db
		.selectFrom("tipitakaPages")
		.select("id")
		.where("slug", "=", ROOT_SLUG)
		.executeTakeFirst();

	if (!page) {
		throw new Error(`Page with slug ${ROOT_SLUG} not found`);
	}

	return page.id;
}
