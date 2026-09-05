import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@libsql/client";

function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}
async function cloudflare(path: string) {
	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${required("CLOUDFLARE_ACCOUNT_ID")}/${path}`,
		{
			headers: { Authorization: `Bearer ${required("CLOUDFLARE_API_TOKEN")}` },
		},
	);
	if (!response.ok)
		throw new Error(`Cloudflare preflight failed: ${response.status}`);
	const body = await response.json();
	if (!body.success) throw new Error("Cloudflare preflight rejected");
	return body.result;
}
if (process.argv[2] === "preflight") {
	const domains = (await cloudflare("workers/domains")).filter(
		(domain: { service: string }) => domain.service === "digital-buddhism",
	);
	if (domains.length !== 1)
		throw new Error(
			`Expected one production custom domain, found ${domains.length}`,
		);
	const origin = `https://${domains[0].hostname}`;
	const response = await fetch(`${origin}/en/tipitaka`);
	if (!response.ok)
		throw new Error(`Production baseline returned ${response.status}`);
	await appendFile(required("GITHUB_ENV"), `VITE_PUBLIC_DOMAIN=${origin}\n`);
	console.log(
		`Production Worker: digital-buddhism; origin: ${origin}; baseline: ${response.status}`,
	);
	const history = await cloudflare(
		"workers/scripts/digital-buddhism/deployments",
	);
	console.log(
		"Previous deployment:",
		JSON.stringify(history.deployments?.[0] ?? history),
	);
} else if (process.argv[2] === "publish") {
	const databaseUrl = required("TURSO_DATABASE_URL");
	const token = required("TURSO_AUTH_TOKEN");
	if (
		!databaseUrl.startsWith("libsql://") &&
		!databaseUrl.startsWith("https://")
	)
		throw new Error("Expected configured production Turso database");
	const snapshotUrl = `file:${join(required("RUNNER_TEMP"), "read-model-source.sqlite")}`;
	const replica = createClient({
		url: snapshotUrl,
		syncUrl: databaseUrl,
		authToken: token,
	});
	try {
		const before = await replica.sync();
		if (!before)
			throw new Error("Snapshot replication did not return a revision");
		const counts = await replica.execute(
			"SELECT (SELECT count(*) FROM tipitaka_pages) AS pages, (SELECT count(*) FROM segments) AS segments, (SELECT count(*) FROM segment_translations) AS translations, (SELECT count(*) FROM selected_segment_gloss_sets) AS selected_gloss_sets",
		);
		console.log("Production snapshot counts:", JSON.stringify(counts.rows));
		if (Number(counts.rows[0]?.pages) === 0)
			throw new Error("Production snapshot has no pages");
		process.env.TURSO_DATABASE_URL = snapshotUrl;
		delete process.env.TURSO_AUTH_TOKEN;
		const { publishTipitakaReadModelsWithWrangler } =
			await import("./tipitaka-import/application/publish-read-model");
		const { disposeDb } = await import("../src/db");
		try {
			await publishTipitakaReadModelsWithWrangler(true);
		} finally {
			await disposeDb();
		}
		const after = await replica.sync();
		if (!after || before.frame_no !== after.frame_no)
			throw new Error(
				"Production changed during snapshot publication; Worker was not deployed. Regenerate from the latest snapshot.",
			);
		console.log(
			"All v2 snapshots published; source database did not change during publication.",
		);
	} finally {
		replica.close();
	}
} else {
	throw new Error("Expected preflight or publish");
}
