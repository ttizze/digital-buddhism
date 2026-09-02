import { redirect } from "@tanstack/react-router";
import type * as v from "valibot";
import { getCurrentUser } from "@/app/_service/auth-server";
import { createServerLogger } from "@/app/_service/logger.server";
import { parseFormData } from "@/app/[locale]/_utils/parse-form-data";
export type AuthDeps = {
	getCurrentUser: typeof getCurrentUser;
	parseFormData: typeof parseFormData;
};
const authDefaultDeps: AuthDeps = {
	getCurrentUser,
	parseFormData,
};

export type RequireAuthDeps = {
	getCurrentUser: typeof getCurrentUser;
};

const requireAuthDefaultDeps: RequireAuthDeps = {
	getCurrentUser,
};

export async function requireAuth(
	deps: RequireAuthDeps = requireAuthDefaultDeps,
): Promise<{ id: string; handle: string; plan: string }> {
	const user = await deps.getCurrentUser();
	if (!user?.id) throw redirect({ href: "/auth/login" });

	// userはnullではないことが保証されている
	return { id: user.id, handle: user.handle, plan: user.plan };
}
export async function authAndValidate<const TSchema extends v.GenericSchema>(
	schema: TSchema,
	formData: FormData,
	deps: AuthDeps = authDefaultDeps,
): Promise<
	| {
			success: true;
			currentUser: {
				id: string;
				handle: string;
				plan: string;
			};
			data: v.InferOutput<TSchema>;
	  }
	| {
			success: false;
			validationErrors: Partial<Record<string, string[]>>;
	  }
> {
	const user = await requireAuth(deps);

	const parsed = deps.parseFormData(schema, formData);
	const logger = createServerLogger("auth-and-validate", { userId: user.id });
	if (!parsed.success) {
		const failedFields = Object.keys(parsed.validationErrors);
		logger.warn({ failedFields }, "Valibot validation errors");
		// 開発環境では入力値もデバッグ出力
		if (import.meta.env.DEV) {
			const rawData = Object.fromEntries(formData.entries());
			logger.debug({ rawData }, "Valibot validation raw data");
		}
		return {
			success: false,
			validationErrors: parsed.validationErrors,
		};
	}
	/* 3. 成功 ――――――――――――――――――― */
	return {
		success: true,
		currentUser: { id: user.id, handle: user.handle, plan: user.plan },
		data: parsed.data,
	};
}
