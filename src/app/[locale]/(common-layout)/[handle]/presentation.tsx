import type { ReactNode } from "react";
import { UserInfo } from "./_components/user-info";
import { UserTranslationList } from "./_components/user-translation-list";
import type { ProfilePageData } from "./_service/profile";

export function ProfilePagePresentation({
	data,
	floatingControls,
	locale,
	page,
}: {
	data: ProfilePageData;
	floatingControls: ReactNode;
	locale: string;
	page: number;
}) {
	return (
		<>
			<UserInfo data={data} locale={locale} />
			<UserTranslationList
				contributions={data.contributions}
				isOwner={data.isOwner}
				locale={locale}
				page={page}
				totalPages={data.totalPages}
			/>
			{floatingControls}
		</>
	);
}
