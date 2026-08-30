import { db } from "@/db";

export async function fetchUserByHandle(handle: string) {
	return (
		(await db
			.selectFrom("users")
			.selectAll()
			.where("handle", "=", handle)
			.executeTakeFirst()) ?? null
	);
}
