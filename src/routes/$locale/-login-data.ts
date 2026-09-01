import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeaders,
	setResponseHeader,
} from "@tanstack/react-start/server";
import * as v from "valibot";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { supportedLocaleSchema } from "./-supported-locale-schema";

const loginInput = v.object({
	locale: supportedLocaleSchema,
	next: v.optional(v.string()),
});

export const getLoginData = createServerFn({ method: "GET" })
	.validator(loginInput)
	.handler(async ({ data }) => {
		setResponseHeader("Cache-Control", "private, no-store");
		setResponseHeader("Vary", "Cookie");

		if (await getCurrentUserFromHeaders(new Headers(getRequestHeaders()))) {
			throw redirect({
				href:
					data.next?.startsWith("/") &&
					!data.next.startsWith("//") &&
					!data.next.includes("\\") &&
					!/%(?:0a|0d|2f|5c)/iu.test(data.next)
						? data.next
						: "/",
			});
		}
	});
