import * as v from "valibot";

type ParseFormDataResult<TSchema extends v.GenericSchema> =
	| { success: true; data: v.InferOutput<TSchema> }
	| {
			success: false;
			validationErrors: Partial<Record<string, string[]>>;
	  };

export function parseFormData<const TSchema extends v.GenericSchema>(
	schema: TSchema,
	formData: FormData,
): ParseFormDataResult<TSchema> {
	const data: Record<string, string | string[]> = {};
	for (const [key, value] of formData.entries()) {
		if (value instanceof File) continue;
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

	return {
		success: false,
		validationErrors: v.flatten(result.issues).nested ?? {},
	};
}
