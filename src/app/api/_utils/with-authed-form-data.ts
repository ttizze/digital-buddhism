import type * as v from "valibot";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { parseFormData } from "@/app/[locale]/_utils/parse-form-data";
import { isSameOriginRequest } from "./is-same-origin-request";

type CurrentUser = NonNullable<
	Awaited<ReturnType<typeof getCurrentUserFromHeaders>>
>;

/**
 * フォーム変更系APIの共通前処理:
 * same-origin 確認 → 認証 → formData 取得 → Valibot 検証。
 * 失敗時は統一エラー形式 { error, validationErrors? } のレスポンスを返す。
 */
export async function withAuthedFormData<Schema extends v.GenericSchema>(
	request: Request,
	schema: Schema,
	handler: (
		data: v.InferOutput<Schema>,
		currentUser: CurrentUser,
	) => Promise<Response>,
): Promise<Response> {
	if (!isSameOriginRequest(request)) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	if (!currentUser) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return Response.json({ error: "Invalid form data" }, { status: 400 });
	}

	const parsed = parseFormData(schema, formData);
	if (!parsed.success) {
		return Response.json(
			{
				error: "Invalid form data",
				validationErrors: parsed.validationErrors,
			},
			{ status: 400 },
		);
	}

	return handler(parsed.data, currentUser);
}
