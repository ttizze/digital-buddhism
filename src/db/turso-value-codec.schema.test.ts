import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as schema from "@/drizzle/schema";
import {
	booleanResultColumns,
	dateResultColumns,
	inputCodecs,
} from "./turso-value-codec";

// コーデックの手書きカラム表がスキーマから乖離すると、型上は Date/boolean なのに
// 実行時は生の数値のまま、という静かな型嘘になる。ここで乖離を CI で検知する。

function snakeToCamel(name: string): string {
	return name.replace(/_([a-z])/g, (_match, letter: string) =>
		letter.toUpperCase(),
	);
}

function collectSchemaColumns(): Map<string, string> {
	const columns = new Map<string, string>();
	for (const exported of Object.values(schema)) {
		let tableColumns: ReturnType<typeof getTableColumns> | undefined;
		try {
			tableColumns = getTableColumns(
				exported as Parameters<typeof getTableColumns>[0],
			);
		} catch {
			continue;
		}
		if (!tableColumns) continue;
		for (const column of Object.values(tableColumns)) {
			columns.set(column.name, column.columnType);
		}
	}
	return columns;
}

describe("turso-value-codec とスキーマの同期", () => {
	const schemaColumns = collectSchemaColumns();
	const timestampColumns = [...schemaColumns]
		.filter(([, type]) => type === "SQLiteTimestamp")
		.map(([name]) => name);
	const booleanColumns = [...schemaColumns]
		.filter(([, type]) => type === "SQLiteBoolean")
		.map(([name]) => name);
	const jsonColumns = [...schemaColumns]
		.filter(([, type]) => type === "SQLiteTextJson")
		.map(([name]) => name);

	it("スキーマの全 timestamp カラムが入力/結果コーデックに登録されている", () => {
		expect(timestampColumns.length).toBeGreaterThan(0);
		for (const column of timestampColumns) {
			expect(inputCodecs[column], `inputCodecs missing ${column}`).toBe(
				"timestamp",
			);
			expect(
				dateResultColumns.has(snakeToCamel(column)),
				`dateResultColumns missing ${snakeToCamel(column)}`,
			).toBe(true);
		}
	});

	it("スキーマの全 boolean カラムが入力/結果コーデックに登録されている", () => {
		expect(booleanColumns.length).toBeGreaterThan(0);
		for (const column of booleanColumns) {
			expect(inputCodecs[column], `inputCodecs missing ${column}`).toBe(
				"boolean",
			);
			expect(
				booleanResultColumns.has(snakeToCamel(column)),
				`booleanResultColumns missing ${snakeToCamel(column)}`,
			).toBe(true);
		}
	});

	it("スキーマの全 JSON カラムが入力コーデックに登録されている", () => {
		expect(jsonColumns.length).toBeGreaterThan(0);
		for (const column of jsonColumns) {
			expect(
				inputCodecs[column] === "json" || inputCodecs[column] === "stringArray",
				`inputCodecs missing json codec for ${column}`,
			).toBe(true);
		}
	});

	it("入力コーデックの timestamp/boolean エントリはスキーマに実在するカラムのみ", () => {
		for (const [column, codec] of Object.entries(inputCodecs)) {
			if (codec !== "timestamp" && codec !== "boolean") continue;
			expect(
				schemaColumns.has(column),
				`inputCodecs has stale column ${column}`,
			).toBe(true);
		}
	});
});
