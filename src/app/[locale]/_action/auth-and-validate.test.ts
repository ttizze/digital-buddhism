import * as v from "valibot";
import { describe, expect, it, vi } from "vite-plus/test";
import {
	type AuthDeps,
	authAndValidate,
	type RequireAuthDeps,
	requireAuth,
} from "./auth-and-validate";

/* ---------------- requireAuth ---------------- */
describe("requireAuth", () => {
	it("サインインしていない場合は /auth/login へリダイレクトする", async () => {
		const deps: RequireAuthDeps = {
			getCurrentUser: vi.fn().mockResolvedValue(null),
		};

		const redirectResponse = await requireAuth(deps).catch((cause: unknown) =>
			cause instanceof Response ? cause : Promise.reject(cause),
		);
		expect(redirectResponse).toBeInstanceOf(Response);
		if (!(redirectResponse instanceof Response)) {
			throw new Error("redirectされていません");
		}
		expect(redirectResponse.status).toBe(307);
		expect(redirectResponse.headers.get("Location")).toBe("/auth/login");
	});

	it("サインイン済みなら id と handle を返す", async () => {
		const deps: RequireAuthDeps = {
			getCurrentUser: vi.fn().mockResolvedValue({ id: "u1", handle: "alice" }),
		};

		const user = await requireAuth(deps);
		expect(user).toEqual({ id: "u1", handle: "alice" });
	});
});

/* ---------------- authAndValidate ---------------- */

describe("authAndValidate", () => {
	const schema = v.object({ title: v.string() });

	it("バリデーションエラー時は success:false を返す", async () => {
		const deps: AuthDeps = {
			getCurrentUser: vi.fn().mockResolvedValue({ id: "u1", handle: "alice" }),
			parseFormData: vi.fn().mockReturnValue({
				success: false,
				validationErrors: { title: ["Invalid title"] },
			}),
		};

		const result = await authAndValidate(schema, new FormData(), deps);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.validationErrors).toEqual({
				title: ["Invalid title"],
			});
		}
	});

	it("バリデーション成功時はパース済みデータと user を返す", async () => {
		const formData = new FormData();
		formData.set("title", "hello");

		const deps: AuthDeps = {
			getCurrentUser: vi.fn().mockResolvedValue({ id: "u1", handle: "alice" }),
			parseFormData: vi.fn().mockReturnValue({
				success: true,
				data: { title: "hello" },
			}),
		};

		const result = await authAndValidate(schema, formData, deps);
		expect(result).toEqual({
			success: true,
			currentUser: { id: "u1", handle: "alice" },
			data: { title: "hello" },
		});
	});
});
