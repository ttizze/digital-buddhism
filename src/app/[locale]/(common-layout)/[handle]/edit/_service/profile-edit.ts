import * as v from "valibot";
import { parseFormData } from "@/app/[locale]/_utils/parse-form-data";
import type { ActionResponse } from "@/app/types";
import reservedHandles from "../_components/reserved-handles.json";
import { updateUser } from "../_db/mutations.server";

const RESERVED_HANDLES = [...new Set([...reservedHandles])];

const profileEditSchema = v.object({
	name: v.pipe(
		v.string(),
		v.minLength(3, "Too Short. Must be at least 3 characters"),
		v.maxLength(25, "Too Long. Must be 25 characters or less"),
	),
	handle: v.pipe(
		v.string(),
		v.minLength(3, "Too Short. Must be at least 3 characters"),
		v.maxLength(25, "Too Long. Must be 25 characters or less"),
		v.regex(
			/^[a-zA-Z][a-zA-Z0-9-]*$/,
			"Must start with a alphabet and can only contain alphabets, numbers, and hyphens",
		),
		v.check((name) => {
			const isReserved = RESERVED_HANDLES.some(
				(reserved) => reserved.toLowerCase() === name.toLowerCase(),
			);
			return !isReserved;
		}, "This handle cannot be used"),
		v.check(
			(name) => !/^\d+$/.test(name),
			"handle cannot consist of only numbers",
		),
	),
	profile: v.optional(
		v.pipe(
			v.string(),
			v.maxLength(200, "Too Long. Must be 200 characters or less"),
		),
	),
	twitterHandle: v.optional(
		v.pipe(
			v.string(),
			v.maxLength(100, "Too Long. Must be 100 characters or less"),
			v.check(
				(value) => value === "" || value.startsWith("@"),
				"Must start with @",
			),
			v.transform((value) => (value === "" ? undefined : value)),
		),
	),
});

export type ProfileEditState = ActionResponse<
	{
		name: string;
		profile?: string;
		twitterHandle?: string;
	},
	{
		name: string;
		handle: string;
		profile: string;
		twitterHandle: string;
	}
>;

export async function updateProfileForUser(
	userId: string,
	formData: FormData,
): Promise<ProfileEditState> {
	const parsedData = parseFormData(profileEditSchema, formData);
	if (!parsedData.success) {
		return {
			success: false,
			validationErrors: parsedData.validationErrors,
		};
	}

	const { name, handle, profile, twitterHandle } = parsedData.data;
	await updateUser(userId, {
		name,
		handle,
		profile,
		twitterHandle,
	});

	return {
		success: true,
		message: "User updated successfully",
		data: {
			name,
			profile,
			twitterHandle,
		},
	};
}
