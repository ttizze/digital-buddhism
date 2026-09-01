import { describe, expect, it } from "vitest";
import {
	buildLocalCommandEnv,
	resolveLocalDatabaseDirectory,
	resolveLocalDatabaseUrl,
} from "./with-local-db";

describe("ローカルコマンド環境", () => {
	it("既定ではWorkerから接続できるローカルlibSQLを使う", () => {
		expect(resolveLocalDatabaseUrl({})).toBe("http://127.0.0.1:18080");
		expect(resolveLocalDatabaseDirectory("/workspace/project")).toBe(
			"/workspace/project/.data/digital-buddshim.sqld",
		);
	});

	it("管理対象のlocalhost URLだけを許可する", () => {
		expect(
			resolveLocalDatabaseUrl({
				TURSO_DATABASE_URL: "http://localhost:18080/",
			}),
		).toBe("http://127.0.0.1:18080");
	});

	it("Workerから開けないfile URLを拒否する", () => {
		expect(() =>
			resolveLocalDatabaseUrl({
				TURSO_DATABASE_URL: "file:///tmp/existing.sqlite",
			}),
		).toThrow(
			"Local commands only accept the managed libSQL server at http://127.0.0.1:18080",
		);
	});

	it("共有DBへ接続するURLを拒否する", () => {
		expect(() =>
			resolveLocalDatabaseUrl({
				TURSO_DATABASE_URL: "libsql://production.example",
			}),
		).toThrow(
			"Local commands only accept the managed libSQL server at http://127.0.0.1:18080",
		);
	});

	it("DBとローカル認証の安全な既定値を子プロセスへ渡す", () => {
		const env = buildLocalCommandEnv(
			{ DATABASE_URL: "postgres://external.invalid/main" },
			"http://127.0.0.1:18080",
		);

		expect(env).toMatchObject({
			BETTER_AUTH_SECRET: "digital-buddshim-local-development-secret",
			TURSO_AUTH_TOKEN: "local",
			TURSO_DATABASE_URL: "http://127.0.0.1:18080",
			VITE_PUBLIC_DOMAIN: "http://localhost:3000",
		});
		expect(env.DATABASE_URL).toBeUndefined();
	});
});
