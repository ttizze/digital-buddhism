import { buildAlternates } from "@/app/_lib/seo-helpers";

const metadataByLocale: Record<string, { title: string; description: string }> =
	{
		ja: {
			title: "検索 | Tipiṭaka",
			description: "Tipiṭakaのページと本文を検索できます。",
		},
		en: {
			title: "Search | Tipiṭaka",
			description: "Search Tipiṭaka pages and text.",
		},
		zh: {
			title: "搜索 | Tipiṭaka",
			description: "搜索三藏页面和正文。",
		},
		ko: {
			title: "검색 | Tipiṭaka",
			description: "Tipiṭaka 페이지와 본문을 검색합니다.",
		},
		es: {
			title: "Buscar | Tipiṭaka",
			description: "Busca páginas y texto del Tipiṭaka.",
		},
	};

export function getSearchMetadata(locale: string) {
	const { title, description } =
		metadataByLocale[locale] ?? metadataByLocale.en;
	return {
		title,
		description,
		openGraph: { title, description },
		twitter: { title, description },
		alternates: buildAlternates(locale, "/search"),
	};
}
