import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import * as v from "valibot";
import { getCurrentUser } from "@/app/_service/auth-server";
import { updateProfileForUser } from "@/app/[locale]/(common-layout)/[handle]/edit/_service/profile-edit";
import { supportedLocaleSchema } from "./-supported-locale-schema";

const profileEditDataInput = v.object({
	locale: supportedLocaleSchema,
	handle: v.pipe(v.string(), v.minLength(1)),
});

const profileEditFormInput = (value: unknown) => {
	if (!(value instanceof FormData)) {
		throw new Error("Expected FormData");
	}

	const locale = value.get("locale");
	if (!v.safeParse(supportedLocaleSchema, locale).success) {
		throw new Error("Invalid locale");
	}

	return value;
};

export const getProfileEditData = createServerFn({ method: "GET" })
	.validator(profileEditDataInput)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const currentUser = await getCurrentUser();
		if (!currentUser || currentUser.handle !== data.handle) {
			throw redirect({ href: `/${data.locale}/auth/login` });
		}

		return currentUser;
	});

export const updateProfile = createServerFn({ method: "POST" })
	.validator(profileEditFormInput)
	.handler(async ({ data }) => {
		const locale = data.get("locale");
		const handle = data.get("handle");
		if (typeof locale !== "string" || typeof handle !== "string") {
			throw new Error("Invalid profile edit form data");
		}

		const currentUser = await getCurrentUser();
		if (!currentUser) {
			throw redirect({ href: `/${locale}/auth/login` });
		}

		const result = await updateProfileForUser(currentUser.id, data);
		if (result.success && handle !== currentUser.handle) {
			throw redirect({ href: `/${locale}/${handle}/edit` });
		}
		return result;
	});
