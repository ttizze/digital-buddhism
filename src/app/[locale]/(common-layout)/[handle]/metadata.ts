import { buildAlternates } from "@/app/_lib/seo-helpers";
import { getMessages } from "@/app/_constants/messages";

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
	const messages = getMessages(locale);
	const description =
		pageOwner.profile ||
		messages.Profile.metadataDescription.replace(
			"{name}",
			() => pageOwner.name,
		);

	return {
		title,
		description,
		image: pageOwner.image || undefined,
		alternates: buildAlternates(locale, `/${pageOwner.handle}`),
	};
}
