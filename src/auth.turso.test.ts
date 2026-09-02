import { parseSetCookieHeader } from "better-auth/cookies";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { auth } from "./auth";
import {
	getDatabaseClient,
	runWithDatabaseRequestContext,
} from "./db/request-context";

const { sendMagicLinkEmailMock } = vi.hoisted(() => ({
	sendMagicLinkEmailMock: vi.fn(
		async (_email: string, _url: string, _token: string) => {},
	),
}));

vi.mock("./utils/send-magic-link-email.server", () => ({
	sendMagicLinkEmail: sendMagicLinkEmailMock,
}));

beforeEach(() => {
	sendMagicLinkEmailMock.mockClear();
});

describe("Better AuthのTurso日時", () => {
	it("認証日時をepoch msで保存し移行済みepoch行の期限を正しく判定する", async () => {
		await runWithDatabaseRequestContext({ url: "file::memory:" }, async () => {
			const client = getDatabaseClient();
			await client.batch([
				"CREATE TABLE users (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, email_verified INTEGER, handle TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
				"CREATE TABLE sessions (id TEXT PRIMARY KEY NOT NULL, token TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, ip_address TEXT, user_agent TEXT, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
				"CREATE TABLE verifications (id TEXT PRIMARY KEY NOT NULL, identifier TEXT NOT NULL, value TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER, updated_at INTEGER)",
			]);
			const headers = new Headers({
				origin: "http://localhost:3000",
				"user-agent": "better-auth-turso-test",
			});

			await auth.api.signInMagicLink({
				body: { email: "turso@example.com", name: "Turso Test" },
				headers,
			});
			expect(sendMagicLinkEmailMock).toHaveBeenCalledOnce();
			const token = sendMagicLinkEmailMock.mock.calls[0]?.[2];
			expect(token).toEqual(expect.any(String));
			if (!token) throw new Error("マジックリンクのtokenが送信されていません");

			const rawVerification = await client.execute(
				"SELECT typeof(expires_at) AS expires_type, typeof(created_at) AS created_type, typeof(updated_at) AS updated_type FROM verifications WHERE identifier = ?",
				[token],
			);
			expect(rawVerification.rows[0]).toMatchObject({
				expires_type: "integer",
				created_type: "integer",
				updated_type: "integer",
			});

			const now = Date.now();
			await client.execute({
				sql: "INSERT INTO verifications (id, identifier, value, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
				args: [
					"migrated-verification-id",
					"migrated-verification",
					"migrated-value",
					now + 60_000,
					now,
					now,
				],
			});
			const context = await auth.$context;
			await expect(
				context.internalAdapter.findVerificationValue("migrated-verification"),
			).resolves.toMatchObject({
				identifier: "migrated-verification",
				expiresAt: expect.any(Date),
			});
			const migratedVerification = await client.execute(
				"SELECT id FROM verifications WHERE id = 'migrated-verification-id'",
			);
			expect(migratedVerification.rows).toHaveLength(1);

			const verified = await auth.api.magicLinkVerify({
				query: { token },
				headers,
				returnHeaders: true,
			});
			expect(verified.response.session.expiresAt).toBeInstanceOf(Date);
			const userId = verified.response.user.id;

			const rawSession = await client.execute(
				"SELECT typeof(expires_at) AS expires_type, typeof(created_at) AS created_type, typeof(updated_at) AS updated_type FROM sessions WHERE token = ?",
				[verified.response.token],
			);
			expect(rawSession.rows[0]).toMatchObject({
				expires_type: "integer",
				created_type: "integer",
				updated_type: "integer",
			});

			await client.batch([
				{
					sql: "INSERT INTO sessions (id, token, user_id, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
					args: [
						"migrated-active-session",
						"migrated-active-token",
						userId,
						now + 60_000,
						now,
						now,
					],
				},
				{
					sql: "INSERT INTO sessions (id, token, user_id, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
					args: [
						"migrated-expired-session",
						"migrated-expired-token",
						userId,
						now - 60_000,
						now - 120_000,
						now - 120_000,
					],
				},
			]);

			const sessionCookie = parseSetCookieHeader(
				verified.headers.get("set-cookie") ?? "",
			).get("better-auth.session_token");
			expect(sessionCookie?.value).toEqual(expect.any(String));
			const sessions = await auth.api.listSessions({
				headers: new Headers({
					cookie: `better-auth.session_token=${sessionCookie?.value}`,
				}),
			});
			expect(sessions.map((session) => session.token).sort()).toEqual(
				[verified.response.token, "migrated-active-token"].sort(),
			);
			expect(
				sessions.every((session) => session.expiresAt instanceof Date),
			).toBe(true);
		});
	});
});
