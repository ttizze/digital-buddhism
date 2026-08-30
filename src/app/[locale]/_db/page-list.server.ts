import { db } from "@/db";
import type { TipitakaTextLevel } from "@/drizzle/types";
import type { PageForList, TitleSegment } from "../types";
import { bestTranslationTextSubquery } from "./best-translation-subquery.server";

type PageListRow = {
	id: number;
	slug: string;
	createdAt: Date;
	textLevel: TipitakaTextLevel | null;
	titleSegmentId: number;
	titleText: string;
	translationText: string | null;
};

function toTitleSegment(row: PageListRow): TitleSegment {
	return {
		id: row.titleSegmentId,
		pageId: row.id,
		number: 0,
		text: row.titleText,
		translationText: row.translationText,
	};
}

export function toPageForList(row: PageListRow): PageForList {
	return {
		id: row.id,
		slug: row.slug,
		createdAt: row.createdAt,
		textLevel: row.textLevel,
		titleSegment: toTitleSegment(row),
	};
}

export function buildPageListQuery(locale: string) {
	return db
		.selectFrom("tipitakaPages")
		.innerJoin("segments as titleSegment", (join) =>
			join
				.onRef("titleSegment.tipitakaPageId", "=", "tipitakaPages.id")
				.on("titleSegment.number", "=", 0),
		)
		.select([
			"tipitakaPages.id",
			"tipitakaPages.slug",
			"tipitakaPages.createdAt",
			"tipitakaPages.textLevel",
			"titleSegment.id as titleSegmentId",
			"titleSegment.text as titleText",
		])
		.select((eb) =>
			bestTranslationTextSubquery({
				locale,
				segmentId: eb.ref("titleSegment.id"),
			}).as("translationText"),
		);
}
