import * as v from "valibot";
import { fetchLocaleInfoByPageSlug } from "./_db/queries.server";

const paramsSchema = v.object({
	pageSlug: v.pipe(v.string(), v.minLength(1)),
});

export async function getLocaleInfo(request: Request): Promise<Response> {
	const parseResult = v.safeParse(
		paramsSchema,
		Object.fromEntries(new URL(request.url).searchParams),
	);

	if (!parseResult.success) {
		return Response.json({ message: "pageSlug is required" }, { status: 400 });
	}

	const localeInfo = await fetchLocaleInfoByPageSlug(
		parseResult.output.pageSlug,
	);
	if (!localeInfo) {
		return Response.json({ message: "page not found" }, { status: 404 });
	}

	return Response.json(localeInfo, { status: 200 });
}
