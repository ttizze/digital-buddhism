import { buildAlternates } from "@/app/_lib/seo-helpers";

const metadataByLocale: Record<string, { title: string; description: string }> =
	{
		ja: {
			title: "Tipiṭaka — パーリ仏典を読む・翻訳する",
			description:
				"パーリ仏典Tipiṭakaの原文、翻訳、注釈を読むためのデジタルアーカイブです。",
		},
		en: {
			title: "Tipiṭaka — Read and Translate the Pali Canon",
			description:
				"A digital archive for reading the Pali Tipiṭaka with translations and annotations.",
		},
		zh: {
			title: "Tipiṭaka — 阅读与翻译巴利三藏",
			description: "阅读巴利三藏原文、译文与注释的数字档案。",
		},
		ko: {
			title: "Tipiṭaka — 팔리 삼장 읽기와 번역",
			description: "팔리 삼장의 원문, 번역, 주석을 읽는 디지털 아카이브입니다.",
		},
		es: {
			title: "Tipiṭaka — Leer y traducir el Canon Pali",
			description:
				"Un archivo digital para leer el Tipiṭaka pali con traducciones y anotaciones.",
		},
	};

export function getHomeMetadata(locale: string) {
	const { title, description } =
		metadataByLocale[locale] ?? metadataByLocale.en;

	return {
		title,
		description,
		alternates: buildAlternates(locale, "/"),
	};
}
