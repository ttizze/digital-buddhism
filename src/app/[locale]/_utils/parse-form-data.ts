import * as v from "valibot";

type ParseFormDataResult<TSchema extends v.GenericSchema> =
	| { success: true; data: v.InferOutput<TSchema> }
	| { success: false; validationErrors: Record<string, string[]> };

export function parseFormData<const TSchema extends v.GenericSchema>(
	schema: TSchema,
	formData: FormData,
): ParseFormDataResult<TSchema> {
	const data: Record<string, string | string[]> = {};
	for (const [key, value] of formData.entries()) {
		if (typeof value !== "string") continue;
		const existing = data[key];
		if (existing === undefined) {
			data[key] = value;
		} else if (Array.isArray(existing)) {
			existing.push(value);
		} else {
			data[key] = [existing, value];
		}
	}
	const result = v.safeParse(schema, data);
	if (result.success) return { success: true, data: result.output };

	const validationErrors: Record<string, string[]> = {};
	for (const [field, messages] of Object.entries(
		v.flatten(result.issues).nested ?? {},
	)) {
		if (messages) validationErrors[field] = messages;
	}
	return { success: false, validationErrors };
}
