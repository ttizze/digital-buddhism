import type { User } from "@/db/types.helpers";
import {
	fetchUserByHandle,
	fetchUserTranslationContributions,
	type UserTranslationContribution,
} from "../_db/queries";

export type ProfilePageData = {
	pageOwner: Pick<
		User,
		"id" | "handle" | "name" | "image" | "profile" | "twitterHandle"
	>;
	isOwner: boolean;
	contributions: UserTranslationContribution[];
	totalPages: number;
};

export async function fetchProfilePage({
	currentUser,
	handle,
	page,
}: {
	currentUser: { handle: string } | null;
	handle: string;
	page: number;
}): Promise<ProfilePageData | null> {
	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return null;
	}

	const result = await fetchUserTranslationContributions({
		userId: pageOwner.id,
		page,
		pageSize: 5,
	});

	return {
		pageOwner,
		isOwner: currentUser?.handle === pageOwner.handle,
		contributions: result.contributions,
		totalPages: result.totalPages,
	};
}
