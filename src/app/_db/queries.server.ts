import { db } from "@/db";

/** handle からユーザーの公開プロフィール列を取得する（リポジトリで唯一の実装） */
export async function fetchUserByHandle(handle: string) {
	return (
		(await db
			.selectFrom("users")
			.select(["id", "handle", "name", "image", "profile", "twitterHandle"])
			.where("handle", "=", handle)
			.executeTakeFirst()) ?? null
	);
}
