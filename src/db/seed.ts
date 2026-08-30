import "dotenv/config";

import { createId } from "@paralleldrive/cuid2";
import { db, disposeDb } from ".";

async function seed() {
	await ensureTipitakaUser();
	console.log("Seed completed");
}

async function ensureTipitakaUser(): Promise<string> {
	const result = await db
		.insertInto("users")
		.values({
			id: createId(),
			handle: "tipitaka",
			name: "Tipiṭaka",
			provider: "Admin",
			image: "/favicon.svg",
			email: "tipitaka@example.invalid",
			profile: "",
			twitterHandle: "",
			plan: "free",
			totalPoints: 0,
			isAi: false,
		})
		.onConflict((oc) => oc.column("handle").doUpdateSet({ handle: "tipitaka" }))
		.returning("id")
		.executeTakeFirstOrThrow();

	return result.id;
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await disposeDb();
	});
