import { access, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { type Client, createClient } from "@libsql/client";
import { Pool, types as postgresTypes } from "pg";
import { openMigratedTursoDatabase } from "./turso-migrations";

const BATCH_SIZE = 500;
const TIMESTAMP_WITHOUT_TIME_ZONE_OID = 1114;

/** 移送対象をアプリケーションの実テーブルだけに限定する。順序はFKを無効にして投入するため意味を持たない。 */
export const APP_TABLE_NAMES = [
	"accounts",
	"contents",
	"follows",
	"gemini_api_keys",
	"import_files",
	"import_runs",
	"like_pages",
	"notifications",
	"page_comments",
	"page_locale_translation_proofs",
	"page_views",
	"pages",
	"personal_access_tokens",
	"segment_annotation_links",
	"segment_metadata",
	"segment_metadata_types",
	"segment_translations",
	"segment_types",
	"segments",
	"sessions",
	"tag_pages",
	"tags",
	"translation_contexts",
	"translation_jobs",
	"translation_votes",
	"user_settings",
	"users",
	"verifications",
] as const;

type ColumnMetadata = {
	dataType: string;
	udtName: string;
};

type TargetTableMetadata = {
	name: string;
	columns: string[];
	autoIncrement: boolean;
};

type TableMetadata = TargetTableMetadata & {
	sourceColumns: Map<string, ColumnMetadata>;
};

export type SourceRow = Record<string, unknown>;

export type ReadOnlySource = {
	query(queryText: string): Promise<{ rows: SourceRow[] }>;
	release?: () => void | Promise<void>;
	end?: () => Promise<void>;
};

export type MigrationSummary = {
	status: "success";
	generatedDatabasePath: string;
	elapsedMs: number;
	tables: Record<string, { sourceRows: number; targetRows: number }>;
	validation: {
		foreignKeyErrors: SourceRow[];
		integrityCheck: string;
		jsonErrors: Array<{ table: string; column: string; row: number }>;
		enumErrors: Array<{
			table: string;
			column: string;
			row: number;
			value: unknown;
		}>;
		booleanErrors: Array<{
			table: string;
			column: string;
			row: number;
			value: unknown;
		}>;
		sequenceErrors: Array<{
			table: string;
			expected: number;
			actual: number | null;
		}>;
	};
};

export function getNeonConnectionString(env: NodeJS.ProcessEnv): string {
	const connectionString =
		env.DATABASE_URL_UNPOOLED?.trim() || env.DATABASE_URL?.trim();
	if (!connectionString) {
		throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
	}
	return connectionString;
}

function quoteIdentifier(identifier: string): string {
	return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

export function validateTableNames(
	tableNames: readonly string[],
): readonly string[] {
	const known = new Set(APP_TABLE_NAMES);
	const seen = new Set<string>();
	for (const tableName of tableNames) {
		if (!known.has(tableName as (typeof APP_TABLE_NAMES)[number])) {
			throw new Error(`Unknown table: ${tableName}`);
		}
		if (seen.has(tableName)) throw new Error(`Duplicate table: ${tableName}`);
		seen.add(tableName);
	}
	return tableNames;
}

export function buildSourceSelect(
	tableName: string,
	columns: readonly string[],
): string {
	if (
		!APP_TABLE_NAMES.includes(tableName as (typeof APP_TABLE_NAMES)[number])
	) {
		throw new Error(`Unknown table: ${tableName}`);
	}
	return `SELECT ${columns.map(quoteIdentifier).join(", ")} FROM ${quoteIdentifier(tableName)}`;
}

function classifyColumn(
	column: ColumnMetadata,
): "timestamp" | "boolean" | "json" | "array" | "scalar" {
	const type = column.dataType.toLowerCase();
	const udt = column.udtName.toLowerCase();
	if (type.includes("timestamp") || type === "date") return "timestamp";
	if (type === "boolean" || udt === "bool") return "boolean";
	if (type === "json" || type === "jsonb") return "json";
	if (type === "array" || udt.startsWith("_")) return "array";
	return "scalar";
}

function parsePostgresTextArray(value: string): unknown[] {
	if (value === "{}") return [];
	if (!value.startsWith("{") || !value.endsWith("}"))
		throw new Error("Invalid Postgres array");
	const values: unknown[] = [];
	let current = "";
	let quoted = false;
	let quotedItem = false;
	let escaped = false;
	for (const character of value.slice(1, -1)) {
		if (escaped) {
			current += character;
			escaped = false;
			continue;
		}
		if (character === "\\") {
			escaped = true;
			continue;
		}
		if (character === '"') {
			quoted = !quoted;
			quotedItem = true;
			continue;
		}
		if (character === "," && !quoted) {
			values.push(current === "NULL" && !quotedItem ? null : current);
			current = "";
			quotedItem = false;
			continue;
		}
		current += character;
	}
	if (escaped || quoted) throw new Error("Invalid Postgres array");
	values.push(current === "NULL" && !quotedItem ? null : current);
	return values;
}

function canonicalizeJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalizeJson);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.keys(value as Record<string, unknown>)
				.sort()
				.map((key) => [
					key,
					canonicalizeJson((value as Record<string, unknown>)[key]),
				]),
		);
	}
	return value;
}

function parseJsonValue(value: unknown, kind: "json" | "array"): unknown {
	if (Array.isArray(value)) return value;
	if (typeof value !== "string") return value;
	try {
		return JSON.parse(value);
	} catch (error) {
		if (kind === "array") return parsePostgresTextArray(value);
		throw new Error("Invalid JSON", { cause: error });
	}
}

function parsePostgresTimestampWithoutTimeZone(value: string): Date {
	const timestamp = Date.parse(`${value.replace(" ", "T")}Z`);
	if (!Number.isFinite(timestamp)) {
		throw new Error("Invalid timestamp without time zone");
	}
	return new Date(timestamp);
}

export const NEON_SOURCE_TYPES = {
	getTypeParser: (dataTypeId: number, format?: "text" | "binary") =>
		dataTypeId === TIMESTAMP_WITHOUT_TIME_ZONE_OID && format !== "binary"
			? parsePostgresTimestampWithoutTimeZone
			: postgresTypes.getTypeParser(dataTypeId, format),
};

function normalizeTimestamp(value: unknown): number {
	const timestamp =
		value instanceof Date
			? value.getTime()
			: typeof value === "number"
				? value
				: /^\d+(\.\d+)?$/.test(String(value))
					? Number(value)
					: /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(
								String(value),
							)
						? parsePostgresTimestampWithoutTimeZone(String(value)).getTime()
						: Date.parse(String(value));
	if (!Number.isFinite(timestamp)) throw new Error("Invalid timestamp");
	return timestamp;
}

function normalizeBoolean(value: unknown): number {
	if (value === true || value === 1 || value === "t" || value === "true")
		return 1;
	if (value === false || value === 0 || value === "f" || value === "false")
		return 0;
	throw new Error("Invalid boolean");
}

export function normalizeSourceValue(
	column: ColumnMetadata,
	value: unknown,
): string | number | Uint8Array | null {
	if (value === null) return null;
	if (value === undefined) throw new Error("Missing source value");
	const kind = classifyColumn(column);
	if (kind === "timestamp") return normalizeTimestamp(value);
	if (kind === "boolean") return normalizeBoolean(value);
	if (kind === "json" || kind === "array") {
		return JSON.stringify(canonicalizeJson(parseJsonValue(value, kind)));
	}
	if (typeof value === "bigint") {
		const number = Number(value);
		if (!Number.isSafeInteger(number))
			throw new Error("Integer is outside the safe range");
		return number;
	}
	if (typeof value === "string" || typeof value === "number") return value;
	if (value instanceof Uint8Array) return value;
	throw new Error("Unsupported source value");
}

async function readSourceColumns(
	source: ReadOnlySource,
): Promise<Map<string, Map<string, ColumnMetadata>>> {
	const names = APP_TABLE_NAMES.map(quoteLiteral).join(", ");
	const result = await source.query(
		`SELECT table_name, column_name, data_type, udt_name, ordinal_position FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN (${names}) ORDER BY table_name, ordinal_position`,
	);
	const columns = new Map<string, Map<string, ColumnMetadata>>();
	for (const row of result.rows) {
		const tableName = String(row.table_name);
		const columnName = String(row.column_name);
		if (
			!APP_TABLE_NAMES.includes(tableName as (typeof APP_TABLE_NAMES)[number])
		)
			continue;
		let tableColumns = columns.get(tableName);
		if (!tableColumns) {
			tableColumns = new Map();
			columns.set(tableName, tableColumns);
		}
		tableColumns.set(columnName, {
			dataType: String(row.data_type),
			udtName: String(row.udt_name),
		});
	}
	for (const tableName of APP_TABLE_NAMES) {
		if (!columns.has(tableName))
			throw new Error(`Source table metadata is missing: ${tableName}`);
	}
	return columns;
}

async function readEnumValues(
	source: ReadOnlySource,
	metadata: readonly TableMetadata[],
): Promise<Map<string, string[]>> {
	const enumTypes = [
		...new Set(
			metadata.flatMap((table) =>
				[...table.sourceColumns.values()]
					.filter((column) => column.dataType.toLowerCase() === "user-defined")
					.map((column) => column.udtName),
			),
		),
	];
	if (enumTypes.length === 0) return new Map();
	const values = await source.query(
		`SELECT t.typname AS type_name, e.enumlabel AS value FROM pg_type AS t JOIN pg_enum AS e ON e.enumtypid = t.oid WHERE t.typname IN (${enumTypes.map(quoteLiteral).join(", ")}) ORDER BY t.typname, e.enumsortorder`,
	);
	const result = new Map<string, string[]>();
	for (const row of values.rows) {
		const typeName = String(row.type_name);
		const list = result.get(typeName) ?? [];
		list.push(String(row.value));
		result.set(typeName, list);
	}
	return result;
}

async function readTargetMetadata(
	client: Client,
): Promise<TargetTableMetadata[]> {
	const metadata: TargetTableMetadata[] = [];
	for (const tableName of APP_TABLE_NAMES) {
		const columns = await client.execute(
			`PRAGMA table_info(${quoteIdentifier(tableName)})`,
		);
		const names = columns.rows.map((row) => String((row as SourceRow).name));
		if (names.length === 0)
			throw new Error(`Target table is missing: ${tableName}`);
		const createSql = await client.execute(
			"SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
			[tableName],
		);
		metadata.push({
			name: tableName,
			columns: names,
			autoIncrement: /AUTOINCREMENT/i.test(
				String((createSql.rows[0] as SourceRow | undefined)?.sql ?? ""),
			),
		});
	}
	return metadata;
}

export function buildTableMetadata(
	target: readonly TargetTableMetadata[],
	source: Map<string, Map<string, ColumnMetadata>>,
): TableMetadata[] {
	return target.map((targetTable) => {
		const sourceColumns = source.get(targetTable.name);
		if (!sourceColumns)
			throw new Error(`Source table metadata is missing: ${targetTable.name}`);
		const targetColumns = new Set(targetTable.columns);
		const missingInSource = targetTable.columns.filter(
			(column) => !sourceColumns.has(column),
		);
		const extraInSource = [...sourceColumns.keys()]
			.filter((column) => !targetColumns.has(column))
			.sort();
		if (missingInSource.length > 0 || extraInSource.length > 0) {
			throw new Error(
				`Column mismatch for ${targetTable.name}: missing in source [${missingInSource.join(", ")}]; extra in source [${extraInSource.join(", ")}]`,
			);
		}
		return { ...targetTable, sourceColumns };
	});
}

async function createOutputDatabase(
	outputPath?: string,
): Promise<{ client: Client; path: string }> {
	const path = outputPath
		? resolve(outputPath)
		: join(
				await mkdtemp(join(tmpdir(), "digital-buddshim-neon-")),
				"database.sqlite",
			);
	if (outputPath?.startsWith("file:"))
		throw new Error("outputPath must be a local filesystem path");
	if (outputPath) {
		try {
			await access(path);
			throw new Error("outputPath already exists");
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
		await mkdir(dirname(path), { recursive: true });
	}
	const client = await openMigratedTursoDatabase(
		pathToFileURL(path).toString(),
	);
	return { client, path };
}

function buildInsertStatement(
	table: TableMetadata,
	row: SourceRow,
): { sql: string; args: Array<string | number | Uint8Array | null> } {
	return {
		sql: `INSERT INTO ${quoteIdentifier(table.name)} (${table.columns.map(quoteIdentifier).join(", ")}) VALUES (${table.columns.map(() => "?").join(", ")})`,
		args: table.columns.map((column) =>
			normalizeSourceValue(table.sourceColumns.get(column)!, row[column]),
		),
	};
}

async function insertRows(
	transaction: Awaited<ReturnType<Client["transaction"]>>,
	table: TableMetadata,
	rows: readonly SourceRow[],
): Promise<void> {
	const statements = rows.map((row) => buildInsertStatement(table, row));
	for (let index = 0; index < statements.length; index += BATCH_SIZE) {
		await transaction.batch(statements.slice(index, index + BATCH_SIZE));
	}
}

async function validateTarget(
	client: Client,
	tables: readonly TableMetadata[],
	sourceCounts: Record<string, number>,
	enumValues: Map<string, string[]>,
): Promise<
	MigrationSummary["validation"] & { tables: MigrationSummary["tables"] }
> {
	const foreignKeyErrors = (await client.execute("PRAGMA foreign_key_check"))
		.rows as SourceRow[];
	const integrityRows = await client.execute("PRAGMA integrity_check");
	const integrityCheck = String(integrityRows.rows[0]?.integrity_check ?? "");
	const result: MigrationSummary["validation"] & {
		tables: MigrationSummary["tables"];
	} = {
		tables: {},
		foreignKeyErrors,
		integrityCheck,
		jsonErrors: [],
		enumErrors: [],
		booleanErrors: [],
		sequenceErrors: [],
	};

	for (const table of tables) {
		const quoted = quoteIdentifier(table.name);
		const count = await client.execute(
			`SELECT COUNT(*) AS count FROM ${quoted}`,
		);
		const targetRows = Number((count.rows[0] as SourceRow).count);
		result.tables[table.name] = {
			sourceRows: sourceCounts[table.name] ?? 0,
			targetRows,
		};
		for (const [column, metadata] of table.sourceColumns) {
			const kind = classifyColumn(metadata);
			if (kind === "json" || kind === "array") {
				const rows = await client.execute(
					`SELECT ${quoteIdentifier(column)} AS value FROM ${quoted}`,
				);
				rows.rows.forEach((row, index) => {
					try {
						JSON.parse(String((row as SourceRow).value));
					} catch {
						result.jsonErrors.push({ table: table.name, column, row: index });
					}
				});
			}
			if (kind === "boolean") {
				const rows = await client.execute(
					`SELECT ${quoteIdentifier(column)} AS value FROM ${quoted}`,
				);
				rows.rows.forEach((row, index) => {
					const value = (row as SourceRow).value;
					if (value !== null && value !== 0 && value !== 1) {
						result.booleanErrors.push({
							table: table.name,
							column,
							row: index,
							value,
						});
					}
				});
			}
			if (metadata.dataType.toLowerCase() === "user-defined") {
				const allowed = enumValues.get(metadata.udtName) ?? [];
				if (allowed.length > 0) {
					const rows = await client.execute(
						`SELECT ${quoteIdentifier(column)} AS value FROM ${quoted}`,
					);
					rows.rows.forEach((row, index) => {
						const value = (row as SourceRow).value;
						if (!allowed.includes(String(value)))
							result.enumErrors.push({
								table: table.name,
								column,
								row: index,
								value,
							});
					});
				}
			}
		}
		if (table.autoIncrement) {
			const maxRows = await client.execute(
				`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${quoted}`,
			);
			const expected = Number((maxRows.rows[0] as SourceRow).max_id);
			const sequenceRows = await client.execute(
				"SELECT seq FROM sqlite_sequence WHERE name = ?",
				[table.name],
			);
			const actual = sequenceRows.rows[0]
				? Number((sequenceRows.rows[0] as SourceRow).seq)
				: null;
			if (actual !== null && actual < expected)
				result.sequenceErrors.push({ table: table.name, expected, actual });
		}
	}
	return result;
}

export async function migrateSourceToSqlite(options: {
	source: ReadOnlySource;
	outputPath?: string;
}): Promise<MigrationSummary> {
	const startedAt = Date.now();
	validateTableNames(APP_TABLE_NAMES);
	const sourceColumns = await readSourceColumns(options.source);
	const target = await createOutputDatabase(options.outputPath);
	try {
		const targetTables = await readTargetMetadata(target.client);
		const tables = buildTableMetadata(targetTables, sourceColumns);
		const enumValues = await readEnumValues(options.source, tables);
		const sourceCounts: Record<string, number> = {};
		await target.client.execute("PRAGMA foreign_keys = OFF");
		const transaction = await target.client.transaction("write");
		try {
			for (const table of tables) {
				const rows = (
					await options.source.query(
						buildSourceSelect(table.name, table.columns),
					)
				).rows;
				sourceCounts[table.name] = rows.length;
				await insertRows(transaction, table, rows);
			}
			await transaction.commit();
		} catch (error) {
			await transaction.rollback();
			throw error;
		} finally {
			transaction.close();
		}
		await target.client.execute("PRAGMA foreign_keys = ON");
		const validation = await validateTarget(
			target.client,
			tables,
			sourceCounts,
			enumValues,
		);
		const hasCountMismatch = Object.values(validation.tables).some(
			(counts) => counts.sourceRows !== counts.targetRows,
		);
		if (
			validation.foreignKeyErrors.length > 0 ||
			validation.integrityCheck !== "ok" ||
			validation.jsonErrors.length > 0 ||
			validation.enumErrors.length > 0 ||
			validation.booleanErrors.length > 0 ||
			validation.sequenceErrors.length > 0 ||
			hasCountMismatch
		) {
			throw new Error("SQLite validation failed");
		}
		const journalMode = await target.client.execute(
			"PRAGMA journal_mode = WAL",
		);
		if (String(journalMode.rows[0]?.journal_mode).toLowerCase() !== "wal") {
			throw new Error("SQLite WAL mode could not be enabled");
		}
		target.client.close();
		target.client = createClient({
			url: pathToFileURL(target.path).toString(),
		});
		const checkpoint = await target.client.execute(
			"PRAGMA wal_checkpoint(TRUNCATE)",
		);
		if (Number(checkpoint.rows[0]?.busy ?? 1) !== 0) {
			throw new Error("SQLite WAL checkpoint did not complete");
		}
		return {
			status: "success",
			generatedDatabasePath: target.path,
			elapsedMs: Date.now() - startedAt,
			tables: validation.tables,
			validation: {
				foreignKeyErrors: validation.foreignKeyErrors,
				integrityCheck: validation.integrityCheck,
				jsonErrors: validation.jsonErrors,
				enumErrors: validation.enumErrors,
				booleanErrors: validation.booleanErrors,
				sequenceErrors: validation.sequenceErrors,
			},
		};
	} finally {
		target.client.close();
	}
}

export async function migrateNeonToSqlite(
	options: {
		env?: NodeJS.ProcessEnv;
		outputPath?: string;
		source?: ReadOnlySource;
	} = {},
): Promise<MigrationSummary> {
	let source = options.source;
	let pool: Pool | undefined;
	try {
		if (!source) {
			pool = new Pool({
				connectionString: getNeonConnectionString(options.env ?? process.env),
				types: NEON_SOURCE_TYPES,
			});
			const client = await pool.connect();
			source = {
				query: async (queryText: string) => {
					const result = await client.query(queryText);
					return { rows: result.rows as SourceRow[] };
				},
				release: () => client.release(),
			};
		}
		await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
		try {
			const summary = await migrateSourceToSqlite({
				source,
				outputPath: options.outputPath,
			});
			await source.query("COMMIT");
			return summary;
		} catch (error) {
			try {
				await source.query("ROLLBACK");
			} catch (rollbackError) {
				throw new AggregateError(
					[error, rollbackError],
					"Neon snapshot migration and rollback failed",
				);
			}
			throw error;
		}
	} finally {
		try {
			await source?.release?.();
		} finally {
			try {
				await source?.end?.();
			} finally {
				await pool?.end();
			}
		}
	}
}

if (import.meta.main) {
	try {
		console.log(JSON.stringify(await migrateNeonToSqlite()));
	} catch (error) {
		console.error(
			JSON.stringify({
				status: "failed",
				error: error instanceof Error ? error.name : "UnknownError",
				message: "Neon to SQLite migration did not complete",
			}),
		);
		process.exitCode = 1;
	}
}
