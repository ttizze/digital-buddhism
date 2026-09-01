import * as v from "valibot";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { TranslateActionState } from "./action";
import { translatePage } from "./service/translate-page.server";

const schema = v.object({
	pageSlug: v.pipe(v.string(), v.minLength(1)),
	aiModel: v.pipe(v.string(), v.minLength(1)),
	targetLocale: v.pipe(v.string(), v.minLength(1)),
});

export async function executeTranslateAction(
	formData: FormData,
): Promise<TranslateActionState> {
	const v = await authAndValidate(schema, formData);
	if (!v.success) {
		return { success: false, validationErrors: v.validationErrors };
	}

	const { currentUser, data } = v;

	const result = await translatePage({
		pageSlug: data.pageSlug,
		aiModel: data.aiModel,
		locale: data.targetLocale,
		userId: currentUser.id,
	});

	if (!result.success) {
		return { success: false, message: result.message };
	}

	return { success: true, data: { translationJobs: result.jobs } };
}
