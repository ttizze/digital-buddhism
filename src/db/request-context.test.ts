import { describe, expect, it, vi } from "vite-plus/test";
import {
	getDatabaseConnectionConfig,
	getDatabaseRequestContext,
	runWithDatabaseRequestContext,
} from "./request-context";

describe("データベースのrequestコンテキスト", () => {
	it("requestごとにTurso接続情報を分離する", async () => {
		const first = await runWithDatabaseRequestContext(
			{
				url: "https://first.turso.io",
				authToken: "first-token",
			},
			async () => {
				const firstContext = getDatabaseRequestContext();

				const secondContext = await runWithDatabaseRequestContext(
					{
						url: "https://second.turso.io",
						authToken: "second-token",
					},
					() => getDatabaseRequestContext(),
				);

				return { firstContext, secondContext };
			},
		);

		expect(first.firstContext?.url).toBe("https://first.turso.io");
		expect(first.firstContext?.authToken).toBe("first-token");
		expect(first.secondContext?.url).toBe("https://second.turso.io");
		expect(first.secondContext?.authToken).toBe("second-token");
	});

	it("request終了時にKyselyをdestroyしてTurso clientを閉じる", async () => {
		const destroy = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
		const close = vi.fn();

		await runWithDatabaseRequestContext(
			{ url: "file:test.db", authToken: undefined },
			() => {
				const context = getDatabaseRequestContext();
				if (!context) throw new Error("request contextがありません");

				context.kysely = { destroy };
				context.client = { close };
			},
		);

		expect(destroy).toHaveBeenCalledOnce();
		expect(close).toHaveBeenCalledOnce();
	});

	it("Kyselyを使わなかったrequestではTurso clientを直接閉じる", async () => {
		const close = vi.fn();

		await runWithDatabaseRequestContext(
			{ url: "file:test.db", authToken: undefined },
			() => {
				const context = getDatabaseRequestContext();
				if (!context) throw new Error("request contextがありません");

				context.client = { close };
			},
		);

		expect(close).toHaveBeenCalledOnce();
	});

	it("streaming responseの本文が完了するまでTurso clientを閉じない", async () => {
		const close = vi.fn();
		let finishBody: (() => void) | undefined;

		const response = await runWithDatabaseRequestContext(
			{ url: "file:test.db", authToken: undefined },
			() => {
				const context = getDatabaseRequestContext();
				if (!context) throw new Error("request contextがありません");

				context.client = { close };
				return new Response(
					new ReadableStream({
						start(controller) {
							controller.enqueue(new TextEncoder().encode("first"));
							finishBody = () => controller.close();
						},
					}),
				);
			},
		);

		expect(close).not.toHaveBeenCalled();
		finishBody?.();
		await expect(response.text()).resolves.toBe("first");
		await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
	});

	it("streaming responseがcancelされたらTurso clientを閉じる", async () => {
		const close = vi.fn();

		const response = await runWithDatabaseRequestContext(
			{ url: "file:test.db", authToken: undefined },
			() => {
				const context = getDatabaseRequestContext();
				if (!context) throw new Error("request contextがありません");

				context.client = { close };
				return new Response(new ReadableStream({ pull() {} }));
			},
		);

		expect(close).not.toHaveBeenCalled();
		await response.body?.cancel();
		await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
	});

	it("streaming responseの本文生成が失敗してもTurso clientを閉じる", async () => {
		const close = vi.fn();

		const response = await runWithDatabaseRequestContext(
			{ url: "file:test.db", authToken: undefined },
			() => {
				const context = getDatabaseRequestContext();
				if (!context) throw new Error("request contextがありません");

				context.client = { close };
				return new Response(
					new ReadableStream({
						start(controller) {
							controller.error(new Error("本文生成に失敗"));
						},
					}),
				);
			},
		);

		await expect(response.text()).rejects.toThrow("本文生成に失敗");
		await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
	});

	it("streaming responseの本文生成でもrequest contextを引き継ぐ", async () => {
		const response = await runWithDatabaseRequestContext(
			{ url: "https://stream.turso.io", authToken: "stream-token" },
			() =>
				new Response(
					new ReadableStream({
						pull(controller) {
							controller.enqueue(
								new TextEncoder().encode(
									getDatabaseRequestContext()?.url ?? "missing",
								),
							);
							controller.close();
						},
					}),
				),
		);

		await expect(response.text()).resolves.toBe("https://stream.turso.io");
	});

	it("request contextの外側では接続情報を返さない", () => {
		expect(getDatabaseRequestContext()).toBeUndefined();
	});

	it("request contextがある場合はprocess.envへフォールバックしない", async () => {
		const previousUrl = process.env.TURSO_DATABASE_URL;
		process.env.TURSO_DATABASE_URL = "file::memory:";

		try {
			await runWithDatabaseRequestContext({}, () => {
				expect(() => getDatabaseConnectionConfig()).toThrow(
					"TURSO_DATABASE_URL is not defined",
				);
			});
		} finally {
			if (previousUrl === undefined) {
				delete process.env.TURSO_DATABASE_URL;
			} else {
				process.env.TURSO_DATABASE_URL = previousUrl;
			}
		}
	});
});
