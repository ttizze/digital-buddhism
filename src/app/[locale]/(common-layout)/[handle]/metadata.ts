import { buildAlternates } from "@/app/_lib/seo-helpers";

export function getProfileMetadata(
	locale: string,
	pageOwner: {
		handle: string;
		image: string;
		name: string;
		profile: string;
	},
) {
	const title = `${pageOwner.name} (@${pageOwner.handle}) | Tipiṭaka`;
	const description =
		pageOwner.profile ||
		`${pageOwner.name}さんのTipiṭakaプロフィール。翻訳活動を確認できます。`;

	return {
		title,
		description,
		image: pageOwner.image || undefined,
		alternates: buildAlternates(locale, `/${pageOwner.handle}`),
	};
}
