import { db } from "@/db";

export async function updateUser(
	userId: string,
	data: {
		name: string;
		handle: string;
		profile: string | undefined;
		twitterHandle: string | undefined;
	},
) {
	await db.updateTable("users").set(data).where("id", "=", userId).execute();
}
