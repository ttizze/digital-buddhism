import { buildAlternates } from "@/app/_lib/seo-helpers";

const englishMetadata = {
	title: "Search | Tipiṭaka",
	description: "Search Tipiṭaka pages and text.",
};

const metadataByLocale = new Map([
	[
		"ja",
		{
			title: "検索 | Tipiṭaka",
			description: "Tipiṭakaのページと本文を検索できます。",
		},
	],
	["en", englishMetadata],
	[
		"zh",
		{
			title: "搜索 | Tipiṭaka",
			description: "搜索三藏页面和正文。",
		},
	],
	[
		"ko",
		{
			title: "검색 | Tipiṭaka",
			description: "Tipiṭaka 페이지와 본문을 검색합니다.",
		},
	],
	[
		"es",
		{
			title: "Buscar | Tipiṭaka",
			description: "Busca páginas y texto del Tipiṭaka.",
		},
	],
]);

export function getSearchMetadata(locale: string) {
	const { title, description } =
		metadataByLocale.get(locale) ?? englishMetadata;
	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		alternates: buildAlternates(locale, "/search"),
	};
}
