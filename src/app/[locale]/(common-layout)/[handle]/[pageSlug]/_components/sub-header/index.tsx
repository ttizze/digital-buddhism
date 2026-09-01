"use client";
import { useHeaderScroll } from "@/app/[locale]/(common-layout)/_components/header/hooks/use-header-scroll";
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
	// カスタムフックを使用 - SubHeaderの特殊な動作のため初期オフセットを考慮
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();
	return (
		<div ref={headerRef}>
			<div
				className={`transition-all duration-300 z-999 ${
					!isVisible ? "-translate-y-full" : ""
				}	${isPinned ? "fixed top-0 left-0 right-0  shadow-md" : ""} bg-background py-4`}
			>
				<div
					className={`prose dark:prose-invert sm:prose lg:prose-lg mx-auto 
					flex items-center not-prose justify-end relative ${isPinned ? "px-4" : ""}`}
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
			</div>
			{isPinned && <div style={{ height: `${headerHeight}px` }} />}
		</div>
	);
}
