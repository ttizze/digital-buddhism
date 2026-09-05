import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import * as v from "valibot";
import { getCurrentUser } from "@/app/_service/auth-server";
import { fetchProfilePage } from "@/app/[locale]/(common-layout)/[handle]/_service/profile";
import { getProfileMetadata } from "@/app/[locale]/(common-layout)/[handle]/metadata";
import { supportedLocaleSchema } from "./-supported-locale-schema";

const handleDataInput = v.object({
	handle: v.pipe(v.string(), v.minLength(1)),
	locale: supportedLocaleSchema,
	page: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

export const getHandleData = createServerFn({ method: "GET" })
	.validator(handleDataInput)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		const currentUser = await getCurrentUser();

		const profile = await fetchProfilePage({
			currentUser: currentUser ? { handle: currentUser.handle } : null,
			handle: data.handle,
			page: data.page,
		});
		return profile
			? {
					...profile,
					metadata: getProfileMetadata(data.locale, profile.pageOwner),
				}
			: null;
	});
