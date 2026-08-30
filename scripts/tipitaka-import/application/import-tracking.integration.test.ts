import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { withImportFile, withImportRun } from "./import-tracking";

await setupDbPerFile(import.meta.url);
const sourceFilePath = path.join(
	process.cwd(),
	"scripts",
	"convert-romn-to-md",
	"data",
	"books.json",
);

describe("Tipitaka import tracking", () => {
	beforeEach(async () => {
		await resetDatabase();
	});

	it("records completed runs and source files with a checksum", async () => {
		const contents = await readFile(sourceFilePath);

		const result = await withImportRun((importRunId) =>
			withImportFile({
				importRunId,
				filePath: sourceFilePath,
				operation: async (importFileId) => importFileId,
			}),
		);

		const importRun = await db
			.selectFrom("importRuns")
			.selectAll()
			.executeTakeFirstOrThrow();
		const importFile = await db
			.selectFrom("importFiles")
			.selectAll()
			.executeTakeFirstOrThrow();

		expect(result).toBe(importFile.id);
		expect(importRun).toMatchObject({ status: "COMPLETED", message: "" });
		expect(importRun.finishedAt).toBeInstanceOf(Date);
		expect(importFile).toMatchObject({
			importRunId: importRun.id,
			path: "scripts/convert-romn-to-md/data/books.json",
			checksum: createHash("sha256").update(contents).digest("hex"),
			status: "COMPLETED",
			message: "",
		});
		expect(importFile.finishedAt).toBeInstanceOf(Date);
	});

	it("records both file and run failures before rethrowing", async () => {
		const failure = new Error("invalid source document");

		await expect(
			withImportRun((importRunId) =>
				withImportFile({
					importRunId,
					filePath: sourceFilePath,
					operation: async () => {
						throw failure;
					},
				}),
			),
		).rejects.toThrow("invalid source document");

		const importRun = await db
			.selectFrom("importRuns")
			.selectAll()
			.executeTakeFirstOrThrow();
		const importFile = await db
			.selectFrom("importFiles")
			.selectAll()
			.executeTakeFirstOrThrow();

		expect(importRun).toMatchObject({
			status: "FAILED",
			message: "invalid source document",
		});
		expect(importRun.finishedAt).toBeInstanceOf(Date);
		expect(importFile).toMatchObject({
			status: "FAILED",
			message: "invalid source document",
		});
		expect(importFile.finishedAt).toBeInstanceOf(Date);
	});

	it("records files that cannot be read", async () => {
		await expect(
			withImportRun((importRunId) =>
				withImportFile({
					importRunId,
					filePath: path.join(process.cwd(), "tipitaka-md-test", "missing.md"),
					operation: async () => undefined,
				}),
			),
		).rejects.toThrow("ENOENT");

		const importRun = await db
			.selectFrom("importRuns")
			.selectAll()
			.executeTakeFirstOrThrow();
		const importFile = await db
			.selectFrom("importFiles")
			.selectAll()
			.executeTakeFirstOrThrow();

		expect(importRun.status).toBe("FAILED");
		expect(importFile).toMatchObject({
			path: "tipitaka-md-test/missing.md",
			checksum: null,
			status: "FAILED",
		});
		expect(importFile.message).toContain("ENOENT");
		expect(importFile.finishedAt).toBeInstanceOf(Date);
	});
});
