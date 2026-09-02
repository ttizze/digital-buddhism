import * as v from "valibot";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { positiveIntegerFromString } from "@/app/api/_utils/request-schemas";
import { privateJsonResponse } from "@/app/api/_utils/with-authed-request";
import { parseTranslationJobsForToast } from "@/app/types/translation-job";
import { fetchTranslationJobsByIds } from "./_db/queries.server";

const idsSchema = v.pipe(
	v.array(positiveIntegerFromString),
	v.minLength(1),
	v.maxLength(50),
);

export async function getTranslationJobs(request: Request): Promise<Response> {
	const currentUser = await getCurrentUserFromHeaders(request.headers);
	if (!currentUser) {
		return privateJsonResponse(
			{ message: "authentication required" },
			{ status: 401 },
		);
	}

	const parsed = v.safeParse(
		idsSchema,
		new URL(request.url).searchParams.getAll("id"),
	);
	if (!parsed.success) {
		return privateJsonResponse(
			{ message: "between 1 and 50 valid id query params are required" },
			{ status: 400 },
		);
	}
	const ids = Array.from(new Set(parsed.output));

	const rows = await fetchTranslationJobsByIds(ids, currentUser.id);
	return privateJsonResponse(parseTranslationJobsForToast(rows), {
		status: 200,
	});
}
