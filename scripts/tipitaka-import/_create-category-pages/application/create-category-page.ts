import { markdownToMdastWithSegments } from "@/app/[locale]/_domain/markdown-to-mdast-with-segments";
import { db } from "@/db";
import { upsertPageAndSegments } from "../../application/upsert-page-and-segments";
import { slugify } from "../../utils/slugify";

interface CategoryPageParams {
	title: string;
	dirPath: string;
	parentId: number;
	position: number;
}

export async function createCategoryPage({
	title,
	dirPath,
	parentId,
	position,
}: CategoryPageParams): Promise<number> {
	const mdast = await markdownToMdastWithSegments({
		header: title,
		markdown: "",
	});

	const slug = slugify(`tipitaka-${dirPath}`);
	await upsertPageAndSegments({
		pageSlug: slug,
		mdastJson: mdast.mdastJson,
		kind: "CATEGORY",
		parentId,
		position,
		isVisible: true,
		segments: mdast.segments,
		segmentTypeId: null,
		anchorPageId: null,
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
