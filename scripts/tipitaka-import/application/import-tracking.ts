import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { createCliLogger } from "../logger";

const MAX_MESSAGE_LENGTH = 2_000;
const logger = createCliLogger("tipitaka-import-tracking");

function errorMessage(cause: unknown): string {
	const message = cause instanceof Error ? cause.message : String(cause);
	return message.slice(0, MAX_MESSAGE_LENGTH);
}

function relativeImportPath(filePath: string): string {
	const relativePath = path.relative(process.cwd(), path.resolve(filePath));
	return relativePath.split(path.sep).join(path.posix.sep);
}

async function markRunFailed(
	importRunId: number,
	cause: unknown,
): Promise<void> {
	try {
		await db
			.updateTable("importRuns")
			.set({
				status: "FAILED",
				message: errorMessage(cause),
				finishedAt: new Date(),
			})
			.where("id", "=", importRunId)
			.where("status", "=", "RUNNING")
			.returning("id")
			.executeTakeFirstOrThrow();
	} catch (trackingError) {
		logger.error("Failed to record failed import run", {
			err: errorMessage(trackingError),
			importRunId,
		});
	}
}

async function markFileFailed(
	importFileId: number,
	cause: unknown,
): Promise<void> {
	try {
		await db
			.updateTable("importFiles")
			.set({
				status: "FAILED",
				message: errorMessage(cause),
				finishedAt: new Date(),
			})
			.where("id", "=", importFileId)
			.where("status", "=", "PENDING")
			.returning("id")
			.executeTakeFirstOrThrow();
	} catch (trackingError) {
		logger.error("Failed to record failed import file", {
			err: errorMessage(trackingError),
			importFileId,
		});
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
			logger.error("Failed to record unreadable import file", {
				err: errorMessage(trackingError),
				importRunId,
				path: importPath,
			});
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
