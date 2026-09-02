import type * as v from "valibot";
import { parseFormData } from "@/app/[locale]/_utils/parse-form-data";
import {
	type ApiCurrentUser,
	privateJsonResponse,
	withAuthedRequest,
} from "./with-authed-request";

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
		currentUser: ApiCurrentUser,
	) => Promise<Response>,
): Promise<Response> {
	return withAuthedRequest(request, async (currentUser) => {
		let formData: FormData;
		try {
			formData = await request.formData();
		} catch {
			return privateJsonResponse(
				{ message: "Invalid form data" },
				{ status: 400 },
			);
		}

		const parsed = parseFormData(schema, formData);
		if (!parsed.success) {
			return privateJsonResponse(
				{
					message: "Invalid form data",
					validationErrors: parsed.validationErrors,
				},
				{ status: 400 },
			);
		}

		return handler(parsed.data, currentUser);
	});
}
