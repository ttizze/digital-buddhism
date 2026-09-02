import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
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
	});

	const slug = slugify(`tipitaka-${dirPath}`);
	const page = await upsertPageAndSegments({
		catalogKey: slug,
		pageSlug: slug,
		mdastJson: mdast.mdastJson,
		textLevel: null,
		parentId,
		position,
		importFileId,
		segments: mdast.segments,
	});

	return page.id;
}
