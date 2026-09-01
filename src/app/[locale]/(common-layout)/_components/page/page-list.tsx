import { Link } from "@tanstack/react-router";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForList } from "@/app/[locale]/types";

type PageListProps = {
	page: PageForList;
	locale: string;
};

export function PageList({ page, locale }: PageListProps) {
	const { titleSegment } = page;
	return (
		<article className="grid gap-4 py-4 border-b last:border-b-0 grid-cols-1">
			{/**
			 * コンテンツ領域はタイトルとフッターの2行。
			 */}
			<div className="grid gap-1 min-w-0">
				{/* タイトル */}
				<div className="grid grid-cols-[1fr_auto] gap-2">
					<Link
						className="block overflow-hidden"
						params={{ locale, pageSlug: page.slug }}
						to="/$locale/tipitaka/$pageSlug"
					>
						<SegmentElement
							className="line-clamp-1 break-all overflow-wrap-anywhere"
							interactive={false}
							segment={titleSegment}
							tagName="span"
						/>
					</Link>
				</div>

				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span>{(page.textLevel ?? "category").toLowerCase()}</span>
					<time>{page.createdAt.toLocaleDateString(locale)}</time>
				</div>
			</div>
		</article>
	);
}
