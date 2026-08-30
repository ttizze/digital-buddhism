import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createServerLogger } from "@/app/_service/logger.server";
import { db } from "@/db";

const MAX_MESSAGE_LENGTH = 2_000;
const logger = createServerLogger("tipitaka-import-tracking");

function errorMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return message.slice(0, MAX_MESSAGE_LENGTH);
}

function relativeImportPath(filePath: string): string {
	const relativePath = path.relative(process.cwd(), path.resolve(filePath));
	return relativePath.split(path.sep).join(path.posix.sep);
}

async function markRunFailed(
	importRunId: number,
	error: unknown,
): Promise<void> {
	try {
		await db
			.updateTable("importRuns")
			.set({
				status: "FAILED",
				message: errorMessage(error),
				finishedAt: new Date(),
			})
			.where("id", "=", importRunId)
			.where("status", "=", "RUNNING")
			.returning("id")
			.executeTakeFirstOrThrow();
	} catch (trackingError) {
		logger.error(
			{ err: trackingError, importRunId },
			"Failed to record failed import run",
		);
	}
}

async function markFileFailed(
	importFileId: number,
	error: unknown,
): Promise<void> {
	try {
		await db
			.updateTable("importFiles")
			.set({
				status: "FAILED",
				message: errorMessage(error),
				finishedAt: new Date(),
			})
			.where("id", "=", importFileId)
			.where("status", "=", "PENDING")
			.returning("id")
			.executeTakeFirstOrThrow();
	} catch (trackingError) {
		logger.error(
			{ err: trackingError, importFileId },
			"Failed to record failed import file",
		);
	}
}

export async function withImportRun<T>(
	operation: (importRunId: number) => Promise<T>,
): Promise<T> {
	const importRun = await db
		.insertInto("importRuns")
		.values({ status: "RUNNING" })
		.returning("id")
		.executeTakeFirstOrThrow();

	try {
		const result = await operation(importRun.id);
		await db
			.updateTable("importRuns")
			.set({ status: "COMPLETED", message: "", finishedAt: new Date() })
			.where("id", "=", importRun.id)
			.where("status", "=", "RUNNING")
			.returning("id")
			.executeTakeFirstOrThrow();
		return result;
	} catch (error) {
		await markRunFailed(importRun.id, error);
		throw error;
	}
}

export async function withImportFile<T>({
	importRunId,
	filePath,
	operation,
}: {
	importRunId: number;
	filePath: string;
	operation: (importFileId: number, contents: Buffer) => Promise<T>;
}): Promise<T> {
	const importPath = relativeImportPath(filePath);
	let contents: Buffer;
	try {
		contents = await readFile(filePath);
	} catch (error) {
		try {
			await db
				.insertInto("importFiles")
				.values({
					importRunId,
					path: importPath,
					checksum: null,
					status: "FAILED",
					message: errorMessage(error),
					finishedAt: new Date(),
				})
				.executeTakeFirstOrThrow();
		} catch (trackingError) {
			logger.error(
				{ err: trackingError, importRunId, path: importPath },
				"Failed to record unreadable import file",
			);
		}
		throw error;
	}

	const importFile = await db
		.insertInto("importFiles")
		.values({
			importRunId,
			path: importPath,
			checksum: createHash("sha256").update(contents).digest("hex"),
			status: "PENDING",
		})
		.returning("id")
		.executeTakeFirstOrThrow();

	try {
		const result = await operation(importFile.id, contents);
		await db
			.updateTable("importFiles")
			.set({ status: "COMPLETED", message: "", finishedAt: new Date() })
			.where("id", "=", importFile.id)
			.where("status", "=", "PENDING")
			.returning("id")
			.executeTakeFirstOrThrow();
		return result;
	} catch (error) {
		await markFileFailed(importFile.id, error);
		throw error;
	}
}
