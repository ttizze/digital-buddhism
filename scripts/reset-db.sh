#!/usr/bin/env bash

set -euo pipefail

case "${TURSO_DATABASE_URL:-}" in
	file:*) ;;
	*)
		echo "TURSO_DATABASE_URL must be a local file: URL" >&2
		exit 1
		;;
esac

bun --eval '
import { createClient } from "@libsql/client";

const client = createClient({ url: process.env.TURSO_DATABASE_URL });
try {
	await client.execute("PRAGMA foreign_keys = OFF");
	const tables = await client.execute(
		"SELECT name FROM sqlite_master WHERE type = '\''table'\'' AND name NOT LIKE '\''sqlite_%'\''",
	);
	for (const table of tables.rows) {
		const name = String(table.name).replaceAll("\"", "\"\"");
		await client.execute(`DELETE FROM "${name}"`);
	}
	await client.execute("DELETE FROM sqlite_sequence");
	await client.execute("PRAGMA foreign_keys = ON");
} finally {
	client.close();
}
'
