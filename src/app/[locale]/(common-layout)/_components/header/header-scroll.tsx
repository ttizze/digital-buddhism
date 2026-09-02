import type { ReactNode } from "react";
import { StickyHeaderShell } from "./sticky-header-shell";

interface HeaderScrollProps {
	children: ReactNode;
}

export function HeaderScroll({ children }: HeaderScrollProps) {
	return (
		<StickyHeaderShell
			as="header"
			className="z-50 bg-background rounded-b-3xl max-w-3xl mx-auto py-2 md:py-4 px-2 md:px-6 lg:px-8 flex justify-between items-center"
			pinnedClassName="dark:shadow-gray-900"
		>
			{children}
		</StickyHeaderShell>
	);
}
