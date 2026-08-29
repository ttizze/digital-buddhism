import { fetchPaginatedNewPageLists } from "@/app/[locale]/_db/page-list.server";
import type { PageForList } from "@/app/[locale]/types";
import type { User } from "@/db/types.helpers";
import { fetchUserByHandle } from "../_db/queries";

export type ProfilePageData = {
	pageOwner: Pick<
		User,
		"id" | "handle" | "name" | "image" | "profile" | "twitterHandle"
	>;
	isOwner: boolean;
	pageForLists: PageForList[];
	totalPages: number;
};

export async function fetchProfilePage({
	currentUser,
	handle,
	locale,
	page,
}: {
	currentUser: { handle: string } | null;
	handle: string;
	locale: string;
	page: number;
}): Promise<ProfilePageData | null> {
	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return null;
	}

	const pageLists = await fetchPaginatedNewPageLists({
		locale,
		page,
		pageOwnerId: pageOwner.id,
		pageSize: 5,
	});

	return {
		pageOwner,
		isOwner: currentUser?.handle === pageOwner.handle,
		pageForLists: pageLists.pageForLists,
		totalPages: pageLists.totalPages,
	};
}
