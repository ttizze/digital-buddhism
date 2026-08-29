import { buildAlternates } from "@/app/_lib/seo-helpers";

const metadataByLocale: Record<string, { title: string; description: string }> =
	{
		ja: {
			title: "検索 | Evame",
			description: "Evameでティピタカのページ、本文、ユーザーを検索できます。",
		},
		en: {
			title: "Search | Evame",
			description: "Search Tipitaka pages, text, and users on Evame.",
		},
		zh: {
			title: "搜索 | Evame",
			description: "在Evame搜索三藏页面、正文和用户。",
		},
		ko: {
			title: "검색 | Evame",
			description: "Evame에서 티피타카 페이지, 본문, 사용자를 검색하세요.",
		},
		es: {
			title: "Buscar | Evame",
			description: "Busca páginas del Tipitaka, texto y usuarios en Evame.",
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
