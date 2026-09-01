import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import * as v from "valibot";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { fetchProfilePage } from "@/app/[locale]/(common-layout)/[handle]/_service/profile";

const locales = supportedLocaleOptions.map((option) => option.code);
const localeSchema = v.pipe(
	v.string(),
	v.check((locale) => locales.includes(locale)),
);

const handleDataInput = v.object({
	handle: v.pipe(v.string(), v.minLength(1)),
	locale: localeSchema,
	page: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

async function getCurrentUser() {
	return getCurrentUserFromHeaders(new Headers(getRequestHeaders()));
}

export const getHandleData = createServerFn({ method: "GET" })
	.validator(handleDataInput)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const currentUser = await getCurrentUser();

		return fetchProfilePage({
			currentUser: currentUser ? { handle: currentUser.handle } : null,
			handle: data.handle,
			page: data.page,
		});
	});
