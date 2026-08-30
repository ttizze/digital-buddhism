import "dotenv/config";

import { createId } from "@paralleldrive/cuid2";
import { db, disposeDb } from ".";

async function seed() {
	await ensurePrimarySegmentType();
	await ensureEvameUser();
	console.log("Seed completed");
}
async function ensurePrimarySegmentType(): Promise<void> {
	await db
		.insertInto("segmentTypes")
		.values({ key: "PRIMARY", label: "Primary" })
		.onConflict((conflict) => conflict.columns(["key", "label"]).doNothing())
		.execute();
}

async function ensureEvameUser(): Promise<string> {
	const result = await db
		.insertInto("users")
		.values({
			id: createId(),
			handle: "evame",
			name: "evame",
			provider: "Admin",
			image: "https://evame.tech/favicon.svg",
			email: "evame@evame.tech",
			profile: "",
			twitterHandle: "",
			plan: "free",
			totalPoints: 0,
			isAi: false,
		})
		.onConflict((oc) => oc.column("handle").doUpdateSet({ handle: "evame" }))
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
