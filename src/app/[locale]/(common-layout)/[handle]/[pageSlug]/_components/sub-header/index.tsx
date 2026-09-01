"use client";
import { StickyHeaderShell } from "@/app/[locale]/(common-layout)/_components/header/sticky-header-shell";
import type { PageDetail } from "@/app/[locale]/types";
import type { TocItem } from "../../_domain/extract-toc-items";
import { ExportMarkdownButton } from "../export-markdown-button";
import { TocTrigger } from "./toc-trigger";

export function SubHeader({
	pageDetail,
	tocItems,
	markdown,
}: {
	pageDetail: PageDetail;
	tocItems: TocItem[];
	markdown: string;
}) {
	return (
		<StickyHeaderShell className="z-999 bg-background py-4">
			<div
				className="prose dark:prose-invert sm:prose lg:prose-lg mx-auto
				flex items-center not-prose justify-end relative group-data-[pinned=true]:px-4"
			>
				<div className="flex items-center gap-2">
					<ExportMarkdownButton
						markdown={markdown}
						slug={pageDetail.slug}
						title={pageDetail.title}
					/>
					<TocTrigger items={tocItems} />
				</div>
			</div>
		</StickyHeaderShell>
	);
}
