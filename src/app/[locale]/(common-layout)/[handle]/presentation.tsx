import type { ReactNode } from "react";
import { UserInfo } from "./_components/user-info";
import { UserPageList } from "./_components/user-page-list";
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
			<UserPageList
				isOwner={data.isOwner}
				locale={locale}
				page={page}
				pageForLists={data.pageForLists}
				totalPages={data.totalPages}
			/>
			{floatingControls}
		</>
	);
}
