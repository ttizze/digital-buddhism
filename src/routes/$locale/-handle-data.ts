import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import * as v from "valibot";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { fetchProfilePage } from "@/app/[locale]/(common-layout)/[handle]/_service/profile";
import { supportedLocaleSchema } from "./-supported-locale-schema";

const handleDataInput = v.object({
	handle: v.pipe(v.string(), v.minLength(1)),
	locale: supportedLocaleSchema,
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
