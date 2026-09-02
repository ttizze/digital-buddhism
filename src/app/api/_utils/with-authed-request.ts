import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { isSameOriginRequest } from "./is-same-origin-request";
import { PRIVATE_RESPONSE_HEADERS } from "./private-response-headers";

export type ApiCurrentUser = NonNullable<
	Awaited<ReturnType<typeof getCurrentUserFromHeaders>>
>;

export function privateJsonResponse(
	data: unknown,
	init: ResponseInit,
): Response {
	const headers = new Headers(init.headers);
	for (const [name, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
		headers.set(name, value);
	}
	return Response.json(data, { ...init, headers });
}

function withPrivateResponseHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
		headers.set(name, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export async function withAuthedRequest(
	request: Request,
	handler: (currentUser: ApiCurrentUser) => Promise<Response>,
): Promise<Response> {
	if (!isSameOriginRequest(request)) {
		return privateJsonResponse({ message: "Forbidden" }, { status: 403 });
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	if (!currentUser) {
		return privateJsonResponse({ message: "Unauthorized" }, { status: 401 });
	}

	return withPrivateResponseHeaders(await handler(currentUser));
}
