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
let incrementTranslationProgress: typeof import("./mutations.server")["incrementTranslationProgress"];

async function createTranslationJobsTable() {
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
}

describe("incrementTranslationProgress の libSQL トランザクション", () => {
	beforeAll(async () => {
		({ incrementTranslationProgress } = await import("./mutations.server"));
	});

	beforeEach(async () => {
		vi.stubEnv("TURSO_DATABASE_URL", `file:${databasePath}`);
		vi.stubEnv("TURSO_AUTH_TOKEN", "");
		await disposeDb();
		setupClient = createClient({ url: `file:${databasePath}` });
		await setupClient.execute("DROP TABLE IF EXISTS translation_jobs");
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

	it("多段更新を1つのトランザクションとしてcommitする", async () => {
		const result = await incrementTranslationProgress(1, 10);

		expect(result?.status).toBe("COMPLETED");
		expect(result?.progress).toBe(100);

		const row = await setupClient.execute(
			"SELECT status, progress FROM translation_jobs WHERE id = 1",
		);
		expect(row.rows).toEqual([{ status: "COMPLETED", progress: 100 }]);
	});

	it("後段の更新が失敗したら前段の更新もrollbackする", async () => {
		await setupClient.execute(`
			CREATE TRIGGER fail_translation_completion
			BEFORE UPDATE OF progress ON translation_jobs
			WHEN NEW.status = 'COMPLETED'
			BEGIN
				SELECT RAISE(ABORT, 'completion failed');
			END
		`);

		await expect(incrementTranslationProgress(1, 10)).rejects.toThrow(
			"completion failed",
		);

		const row = await setupClient.execute(
			"SELECT status, progress FROM translation_jobs WHERE id = 1",
		);
		expect(row.rows).toEqual([{ status: "PENDING", progress: 95 }]);
	});
});
