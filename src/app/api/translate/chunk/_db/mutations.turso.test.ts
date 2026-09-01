import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Client, createClient } from "@libsql/client";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { disposeDb } from "@/db";

const databasePath = join(
	tmpdir(),
	`digital-buddhism-transaction-${randomUUID()}.db`,
);

let setupClient: Client;
let getOrCreateAIUser: typeof import("./mutations.server")["getOrCreateAIUser"];
let setTranslationProgress: typeof import("./mutations.server")["setTranslationProgress"];
let claimTranslationChunk: typeof import("./mutations.server")["claimTranslationChunk"];
let completeTranslationChunk: typeof import("./mutations.server")["completeTranslationChunk"];
let releaseTranslationChunk: typeof import("./mutations.server")["releaseTranslationChunk"];

async function createTranslationJobsTable() {
	await setupClient.execute(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			handle TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			is_ai INTEGER NOT NULL,
			image TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE
		)
	`);
	await setupClient.execute(`
		CREATE TABLE translation_jobs (
			id INTEGER PRIMARY KEY,
			page_id INTEGER NOT NULL,
			user_id TEXT,
			locale TEXT NOT NULL,
			ai_model TEXT NOT NULL,
			status TEXT NOT NULL,
			progress INTEGER NOT NULL,
			error TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`);
	await setupClient.execute(`
		CREATE TABLE translation_chunk_runs (
			translation_job_id INTEGER NOT NULL,
			chunk_index INTEGER NOT NULL,
			lease_token TEXT NOT NULL,
			lease_expires_at INTEGER NOT NULL,
			completed_at INTEGER,
			PRIMARY KEY (translation_job_id, chunk_index),
			FOREIGN KEY (translation_job_id) REFERENCES translation_jobs(id) ON DELETE CASCADE
		)
	`);
}

describe("translation mutations", () => {
	beforeAll(async () => {
		({
			claimTranslationChunk,
			completeTranslationChunk,
			getOrCreateAIUser,
			releaseTranslationChunk,
			setTranslationProgress,
		} = await import("./mutations.server"));
	});

	beforeEach(async () => {
		vi.stubEnv("TURSO_DATABASE_URL", `file:${databasePath}`);
		vi.stubEnv("TURSO_AUTH_TOKEN", "");
		await disposeDb();
		setupClient = createClient({ url: `file:${databasePath}` });
		await setupClient.execute("DROP TABLE IF EXISTS translation_chunk_runs");
		await setupClient.execute("DROP TABLE IF EXISTS translation_jobs");
		await setupClient.execute("DROP TABLE IF EXISTS users");
		await createTranslationJobsTable();
		await setupClient.execute({
			sql: `
				INSERT INTO translation_jobs
					(id, page_id, locale, ai_model, status, progress, error, created_at, updated_at)
				VALUES (1, 1, 'ja', 'test-model', 'PENDING', 95, '', 0, 0)
			`,
			args: [],
		});
	});

	afterEach(async () => {
		await disposeDb();
		setupClient.close();
		vi.unstubAllEnvs();
		await unlink(databasePath).catch(() => undefined);
	});

	it("翻訳済み件数から100%へ更新する", async () => {
		const result = await setTranslationProgress(1, 10, 10);

		expect(result?.status).toBe("COMPLETED");
		expect(result?.progress).toBe(100);

		const row = await setupClient.execute(
			"SELECT status, progress FROM translation_jobs WHERE id = 1",
		);
		expect(row.rows).toEqual([{ status: "COMPLETED", progress: 100 }]);
	});

	it("更新に失敗したら既存進捗を維持する", async () => {
		await setupClient.execute(`
			CREATE TRIGGER fail_translation_completion
			BEFORE UPDATE OF progress ON translation_jobs
			WHEN NEW.status = 'COMPLETED'
			BEGIN
				SELECT RAISE(ABORT, 'completion failed');
			END
		`);

		await expect(setTranslationProgress(1, 10, 10)).rejects.toThrow(
			"completion failed",
		);

		const row = await setupClient.execute(
			"SELECT status, progress FROM translation_jobs WHERE id = 1",
		);
		expect(row.rows).toEqual([{ status: "PENDING", progress: 95 }]);
	});

	it("同じAIモデルの並行作成を一つのユーザーへ収束させる", async () => {
		const ids = await Promise.all([
			getOrCreateAIUser("test-model"),
			getOrCreateAIUser("test-model"),
		]);

		expect(new Set(ids).size).toBe(1);
		const row = await setupClient.execute(
			"SELECT count(*) AS count FROM users WHERE handle = 'test-model'",
		);
		expect(row.rows).toEqual([{ count: 1 }]);
	});

	it("同じジョブ・チャンクは同時に一つのleaseだけを取得する", async () => {
		await expect(
			claimTranslationChunk({
				translationJobId: 1,
				chunkIndex: 0,
				leaseToken: "first",
				nowMs: 1_000,
			}),
		).resolves.toEqual({ status: "claimed" });
		await expect(
			claimTranslationChunk({
				translationJobId: 1,
				chunkIndex: 0,
				leaseToken: "duplicate",
				nowMs: 2_000,
			}),
		).resolves.toMatchObject({ status: "busy" });

		await completeTranslationChunk({
			translationJobId: 1,
			chunkIndex: 0,
			leaseToken: "first",
			nowMs: 3_000,
		});
		await expect(
			claimTranslationChunk({
				translationJobId: 1,
				chunkIndex: 0,
				leaseToken: "after-completion",
				nowMs: 4_000,
			}),
		).resolves.toEqual({ status: "completed" });
	});

	it("失敗したleaseを解放するとQueue再配信が取得できる", async () => {
		await claimTranslationChunk({
			translationJobId: 1,
			chunkIndex: 1,
			leaseToken: "failed-attempt",
			nowMs: 1_000,
		});
		await releaseTranslationChunk({
			translationJobId: 1,
			chunkIndex: 1,
			leaseToken: "failed-attempt",
		});

		await expect(
			claimTranslationChunk({
				translationJobId: 1,
				chunkIndex: 1,
				leaseToken: "retry",
				nowMs: 2_000,
			}),
		).resolves.toEqual({ status: "claimed" });
	});
});
