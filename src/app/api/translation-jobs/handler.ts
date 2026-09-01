import * as v from "valibot";
import { getCurrentUser } from "@/app/_service/auth-server";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import { parseTranslationJobsForToast } from "@/app/types/translation-job";
import { fetchTranslationJobsByIds } from "./_db/queries.server";

const idsSchema = v.pipe(
	v.array(v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1))),
	v.minLength(1),
	v.maxLength(50),
);

export async function getTranslationJobs(request: Request): Promise<Response> {
	const currentUser = await getCurrentUser();
	if (!currentUser) {
		return Response.json(
			{ message: "authentication required" },
			{ status: 401, headers: PRIVATE_RESPONSE_HEADERS },
		);
	}

	const parsed = v.safeParse(
		idsSchema,
		new URL(request.url).searchParams.getAll("id"),
	);
	if (!parsed.success) {
		return Response.json(
			{ message: "between 1 and 50 valid id query params are required" },
			{ status: 400, headers: PRIVATE_RESPONSE_HEADERS },
		);
	}
	const ids = Array.from(new Set(parsed.output));

	const rows = await fetchTranslationJobsByIds(ids, currentUser.id);
	return Response.json(parseTranslationJobsForToast(rows), {
		status: 200,
		headers: PRIVATE_RESPONSE_HEADERS,
	});
}
