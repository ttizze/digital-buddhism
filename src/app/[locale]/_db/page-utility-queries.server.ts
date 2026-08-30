import { db } from "@/db";

export async function fetchPageIdBySlug(slug: string) {
	return (
		(await db
			.selectFrom("tipitakaPages")
			.select("id")
			.where("slug", "=", slug)
			.executeTakeFirst()) ?? null
	);
}
