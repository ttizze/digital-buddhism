import {
	customSessionClient,
	magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { BASE_URL } from "@/app/_constants/base-url";
import type { auth } from "@/auth";

export const authClient = createAuthClient({
	plugins: [customSessionClient<typeof auth>(), magicLinkClient()],
	baseURL: BASE_URL,
	/** The path to the auth API route */
	apiPath: "/api/auth",
});
