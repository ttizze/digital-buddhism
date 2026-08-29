import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, disposeDb } from "./index";

describe("KyselyのTurso接続", () => {
	beforeEach(async () => {
		await disposeDb();
		vi.stubEnv("TURSO_DATABASE_URL", "");
		vi.stubEnv("TURSO_AUTH_TOKEN", "");
	});
	afterEach(() => vi.unstubAllEnvs());

	it("TURSO_DATABASE_URLがない場合は接続を作成しない", () => {
		expect(() => db.selectFrom("users")).toThrow(
			"TURSO_DATABASE_URL is not defined",
		);
	});
});
