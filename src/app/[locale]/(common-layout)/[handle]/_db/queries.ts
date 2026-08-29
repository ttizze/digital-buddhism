import { db } from "@/db";

export async function fetchUserByHandle(handle: string) {
	return db
		.selectFrom("users")
		.select(["id", "handle", "name", "image", "profile", "twitterHandle"])
		.where("handle", "=", handle)
		.executeTakeFirst();
}
