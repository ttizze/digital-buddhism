import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { parseFormData } from "@/app/[locale]/_utils/parse-form-data";
import { isSameOriginRequest } from "@/app/api/_utils/is-same-origin-request";
import { db } from "@/db";
import {
	addWordGloss,
	deleteOwnWordGloss,
	handleWordGlossVote,
} from "./_db/mutations.server";
import {
	segmentWordWithGlossSchema,
	wordGlossSchema,
} from "./_domain/word-glosses";

const pageGlossesSchema = z.object({
	pageId: z.coerce.number().int().positive(),
	locale: z.string().min(1),
});

const wordGlossesSchema = z.object({
	wordId: z.coerce.number().int().positive(),
	locale: z.string().min(1),
});

const postSchema = z.object({
	wordId: z.coerce.number().int().positive(),
	locale: z.string().min(1),
	text: z
		.string()
		.trim()
		.min(1, "語義を入力してください")
		.max(300, "語義は300文字以内で入力してください"),
});

const patchSchema = z.object({
	wordGlossId: z.coerce.number().int().positive(),
	isUpvote: z.enum(["true", "false"]).transform((value) => value === "true"),
});

const deleteSchema = z.object({
	glossId: z.coerce.number().int().positive(),
});

async function listWordGlosses(
	wordId: number,
	locale: string,
	currentUserId?: string,
) {
	const rows = await db
		.selectFrom("wordGlosses as gloss")
		.innerJoin("users as user", "gloss.userId", "user.id")
		.leftJoin("wordGlossVotes as vote", (join) =>
			join
				.onRef("vote.glossId", "=", "gloss.id")
				.on("vote.userId", "=", currentUserId ?? ""),
		)
		.leftJoin("selectedWordGlosses as selected", (join) =>
			join
				.onRef("selected.glossId", "=", "gloss.id")
				.onRef("selected.wordId", "=", "gloss.wordId")
				.onRef("selected.locale", "=", "gloss.locale"),
		)
		.select([
			"gloss.id",
			"gloss.wordId",
			"gloss.locale",
			"gloss.text",
			"gloss.point",
			"gloss.createdAt",
			"user.name as userName",
			"user.handle as userHandle",
			"vote.isUpvote as currentUserVoteIsUpvote",
			"selected.glossId as selectedGlossId",
		])
		.where("gloss.wordId", "=", wordId)
		.where("gloss.locale", "=", locale)
		.orderBy("selected.glossId", (order) => order.desc().nullsLast())
		.orderBy("gloss.point", "desc")
		.orderBy("gloss.createdAt", "desc")
		.orderBy("gloss.id", "desc")
		.execute();

	return wordGlossSchema.array().parse(
		rows.map(({ selectedGlossId, ...gloss }) => ({
			...gloss,
			isSelected: selectedGlossId !== null,
		})),
	);
}

async function listPageWordGlosses(
	pageId: number,
	locale: string,
	currentUserId?: string,
) {
	const rows = await db
		.selectFrom("segmentWords as word")
		.innerJoin("segments as segment", "word.segmentId", "segment.id")
		.innerJoin("wordGlosses as gloss", (join) =>
			join
				.onRef("gloss.wordId", "=", "word.id")
				.on("gloss.locale", "=", locale),
		)
		.innerJoin("users as user", "gloss.userId", "user.id")
		.leftJoin("wordGlossVotes as vote", (join) =>
			join
				.onRef("vote.glossId", "=", "gloss.id")
				.on("vote.userId", "=", currentUserId ?? ""),
		)
		.leftJoin("selectedWordGlosses as selected", (join) =>
			join
				.onRef("selected.glossId", "=", "gloss.id")
				.onRef("selected.wordId", "=", "gloss.wordId")
				.onRef("selected.locale", "=", "gloss.locale"),
		)
		.select([
			"word.id as wordId",
			"word.segmentId",
			"word.position",
			"word.startOffset",
			"word.endOffset",
			"word.surface",
			"gloss.id as glossId",
			"gloss.locale",
			"gloss.text",
			"gloss.point",
			"gloss.createdAt",
			"user.name as userName",
			"user.handle as userHandle",
			"vote.isUpvote as currentUserVoteIsUpvote",
			"selected.glossId as selectedGlossId",
		])
		.where("segment.tipitakaPageId", "=", pageId)
		.orderBy("word.segmentId")
		.orderBy("word.position")
		.orderBy("selected.glossId", (order) => order.desc().nullsLast())
		.orderBy("gloss.point", "desc")
		.orderBy("gloss.createdAt", "desc")
		.orderBy("gloss.id", "desc")
		.execute();

	const seenWordIds = new Set<number>();
	const words = [];
	for (const row of rows) {
		if (seenWordIds.has(row.wordId)) continue;
		seenWordIds.add(row.wordId);
		words.push({
			id: row.wordId,
			segmentId: row.segmentId,
			position: row.position,
			startOffset: row.startOffset,
			endOffset: row.endOffset,
			surface: row.surface,
			gloss: {
				id: row.glossId,
				wordId: row.wordId,
				locale: row.locale,
				text: row.text,
				point: row.point,
				createdAt: row.createdAt,
				userName: row.userName,
				userHandle: row.userHandle,
				currentUserVoteIsUpvote: row.currentUserVoteIsUpvote,
				isSelected: row.selectedGlossId !== null,
			},
		});
	}

	return segmentWordWithGlossSchema.array().parse(words);
}

export async function getSegmentGlosses(request: Request): Promise<Response> {
	const searchParams = Object.fromEntries(new URL(request.url).searchParams);
	const currentUser = await getCurrentUserFromHeaders(request.headers);

	try {
		if ("wordId" in searchParams) {
			const validation = wordGlossesSchema.safeParse(searchParams);
			if (!validation.success) {
				return Response.json({ error: "Invalid parameters" }, { status: 400 });
			}
			const glosses = await listWordGlosses(
				validation.data.wordId,
				validation.data.locale,
				currentUser?.id,
			);
			return Response.json(glosses, {
				headers: { "Cache-Control": "no-store" },
			});
		}

		const validation = pageGlossesSchema.safeParse(searchParams);
		if (!validation.success) {
			return Response.json({ error: "Invalid parameters" }, { status: 400 });
		}
		const words = await listPageWordGlosses(
			validation.data.pageId,
			validation.data.locale,
			currentUser?.id,
		);
		return Response.json(words, {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (error) {
		console.error("Error fetching word glosses:", error);
		return Response.json(
			{ error: "Failed to fetch word glosses" },
			{ status: 500 },
		);
	}
}

export async function postWordGloss(request: Request): Promise<Response> {
	const parsed = await parseAuthenticatedForm(request, postSchema);
	if (parsed instanceof Response) return parsed;

	const word = await db
		.selectFrom("segmentWords")
		.select("id")
		.where("id", "=", parsed.data.wordId)
		.executeTakeFirst();
	if (!word) {
		return Response.json(
			{ success: false, message: "単語が見つかりません" },
			{ status: 404 },
		);
	}

	await addWordGloss(
		parsed.data.wordId,
		parsed.data.locale,
		parsed.data.text,
		parsed.userId,
	);
	return Response.json({ success: true });
}

export async function patchWordGlossVote(request: Request): Promise<Response> {
	const parsed = await parseAuthenticatedForm(request, patchSchema);
	if (parsed instanceof Response) return parsed;

	const context = await handleWordGlossVote(
		parsed.data.wordGlossId,
		parsed.data.isUpvote,
		parsed.userId,
	);
	if (!context) {
		return Response.json({ error: "Gloss not found" }, { status: 404 });
	}

	const glosses = await listWordGlosses(
		context.wordId,
		context.locale,
		parsed.userId,
	);
	return Response.json({ success: true, data: { glosses } });
}

export async function deleteWordGloss(request: Request): Promise<Response> {
	const parsed = await parseAuthenticatedForm(request, deleteSchema);
	if (parsed instanceof Response) return parsed;

	const deleted = await deleteOwnWordGloss(parsed.data.glossId, parsed.userId);
	if (!deleted) {
		return Response.json(
			{ error: "Gloss not found or unauthorized" },
			{ status: 404 },
		);
	}
	return Response.json({ success: true });
}

async function parseAuthenticatedForm<Schema extends z.ZodType>(
	request: Request,
	schema: Schema,
): Promise<{ data: z.output<Schema>; userId: string } | Response> {
	if (!isSameOriginRequest(request)) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	if (!currentUser) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return Response.json(
			{ success: false, message: "Invalid form data" },
			{ status: 400 },
		);
	}

	const parsed = await parseFormData(schema, formData);
	if (!parsed.success) {
		return Response.json(
			{
				success: false,
				zodErrors: parsed.error.flatten().fieldErrors,
			},
			{ status: 400 },
		);
	}

	return { data: parsed.data, userId: currentUser.id };
}
