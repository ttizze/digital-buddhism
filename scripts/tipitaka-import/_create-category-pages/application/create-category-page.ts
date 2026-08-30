import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { db } from "@/db";
import { upsertPageAndSegments } from "../../application/upsert-page-and-segments";
import { slugify } from "../../utils/slugify";

interface CategoryPageParams {
	title: string;
	dirPath: string;
	parentId: number;
	position: number;
	importFileId: number;
}

export async function createCategoryPage({
	title,
	dirPath,
	parentId,
	position,
	importFileId,
}: CategoryPageParams): Promise<number> {
	const mdast = await markdownToMdastWithSegments({
		header: title,
		markdown: "",
		autoUploadImages: false,
	});

	const slug = slugify(`tipitaka-${dirPath}`);
	await upsertPageAndSegments({
		catalogKey: slug,
		pageSlug: slug,
		mdastJson: mdast.mdastJson,
		textLevel: null,
		parentId,
		position,
		importFileId,
		segments: mdast.segments,
	});

	const page = await db
		.selectFrom("tipitakaPages")
		.select("id")
		.where("slug", "=", slug)
		.executeTakeFirst();

	if (!page) {
		throw new Error(`Page with slug ${slug} not found`);
	}

	return page.id;
}
