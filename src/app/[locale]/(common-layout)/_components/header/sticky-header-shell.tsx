"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useHeaderScroll } from "./hooks/use-header-scroll";

/**
 * 下スクロールで隠れ、上スクロールで固定表示に戻るヘッダーの共通シェル。
 * 固定中は同じ高さのスペーサーを挿入してレイアウトのジャンプを防ぐ。
 * 固定状態は data-pinned 属性で子へ伝える（group-data-[pinned=true]:... で参照可能）。
 */
export function StickyHeaderShell({
	as: Tag = "div",
	className,
	pinnedClassName,
	children,
}: {
	as?: "div" | "header";
	className: string;
	pinnedClassName?: string;
	children: ReactNode;
}) {
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();

	return (
		<div ref={headerRef}>
			<Tag
				className={cn(
					"group transition-all duration-300",
					!isVisible && "-translate-y-full",
					isPinned && "fixed top-0 left-0 right-0 shadow-md",
					isPinned && pinnedClassName,
					className,
				)}
				data-pinned={isPinned}
			>
				{children}
			</Tag>
			{isPinned && <div style={{ height: `${headerHeight}px` }} />}
		</div>
	);
}
