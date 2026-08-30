import { Link } from "@tanstack/react-router";
import { TIPITAKA_SYSTEM_USER_HANDLE } from "@/app/[locale]/_domain/tipitaka-page-visibility";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForList } from "@/app/[locale]/types";

type PageListProps = {
	PageForList: PageForList;
	index?: number;
	locale: string;
};

export function PageList({ PageForList, index, locale }: PageListProps) {
	const { titleSegment } = PageForList;
	return (
		<article
			className={`grid gap-4 py-4 border-b last:border-b-0 ${
				index !== undefined ? "grid-cols-[max-content_1fr]" : "grid-cols-1"
			}`}
		>
			{/* ───── 1) インデックス番号 ───── */}
			{index !== undefined && (
				<div className="text-lg font-medium text-muted-foreground self-start">
					{index + 1}
				</div>
			)}

			{/* ───── 2) コンテンツ領域 ───── */}
			{/**
			 * コンテンツ領域はタイトルとフッターの2行。
			 */}
			<div className="grid gap-1 min-w-0">
				{/* タイトル */}
				<div className="grid grid-cols-[1fr_auto] gap-2">
					<Link
						className="block overflow-hidden"
						params={{
							handle: TIPITAKA_SYSTEM_USER_HANDLE,
							locale,
							pageSlug: PageForList.slug,
						}}
						to="/$locale/$handle/$pageSlug"
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
					<span>{PageForList.kind.toLowerCase()}</span>
					<time>{PageForList.createdAt.toLocaleDateString(locale)}</time>
				</div>
			</div>
		</article>
	);
}
