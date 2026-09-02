import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import * as v from "valibot";
import { openMigratedTursoDatabase } from "./turso-migrations";

function isLoopbackHttpUrl(url: URL): boolean {
	return (
		url.protocol === "http:" &&
		(url.hostname === "127.0.0.1" || url.hostname === "localhost")
	);
}

const quoteIdentifier = (identifier: string): string =>
	`"${identifier.replaceAll('"', '""')}"`;

async function resetLoopbackDatabase(databaseUrl: string): Promise<void> {
	const client = createClient({ url: databaseUrl });
	try {
		const objects = await client.execute(`
			SELECT type, name
			FROM sqlite_master
			WHERE type IN ('view', 'table')
				AND name NOT LIKE 'sqlite_%'
			ORDER BY CASE type WHEN 'view' THEN 0 ELSE 1 END, name
		`);
		const dropStatements = objects.rows.map((row) => {
			const type = row.type === "view" ? "VIEW" : "TABLE";
			const name = v.parse(v.string(), row.name);
			return `DROP ${type} IF EXISTS ${quoteIdentifier(name)}`;
		});
		await client.executeMultiple(
			[
				"PRAGMA foreign_keys = OFF",
				...dropStatements,
				"PRAGMA foreign_keys = ON",
			].join(";\n"),
		);
	} finally {
		client.close();
	}

	const migratedClient = await openMigratedTursoDatabase(databaseUrl);
	migratedClient.close();
}

export async function resetLocalDatabase(databaseUrl: string): Promise<void> {
	const parsedUrl = new URL(databaseUrl);
	if (isLoopbackHttpUrl(parsedUrl)) {
		await resetLoopbackDatabase(databaseUrl);
		return;
	}
	if (parsedUrl.protocol !== "file:") {
		throw new Error("TURSO_DATABASE_URL must target a local database");
	}

	const databasePath = fileURLToPath(parsedUrl);
	await Promise.all(
		[databasePath, `${databasePath}-shm`, `${databasePath}-wal`].map((path) =>
			rm(path, { force: true }),
		),
	);
	const client = await openMigratedTursoDatabase(databaseUrl);
	client.close();
}

if (import.meta.main) {
	const databaseUrl = process.env.TURSO_DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("TURSO_DATABASE_URL is not defined");
	}
	await resetLocalDatabase(databaseUrl);
}
