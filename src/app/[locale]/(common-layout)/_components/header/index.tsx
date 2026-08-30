import type { ReactNode } from "react";
import { HeaderScroll } from "./header-scroll";

export function HeaderFrame({
	locale,
	userSlot,
}: {
	locale: string;
	userSlot: ReactNode;
}) {
	return (
		<HeaderScroll>
			<div className="flex items-center gap-4">
				<a
					aria-label="Digital Buddhism"
					className="flex items-center gap-2"
					href={`/${locale}`}
				>
					<img
						alt=""
						className="size-8 shrink-0 dark:invert"
						src="/apple-touch-icon.png"
					/>
					<span className="hidden font-semibold text-xl sm:inline">
						Digital Buddhism
					</span>
				</a>
			</div>
			<div className="flex items-center gap-4">{userSlot}</div>
		</HeaderScroll>
	);
}
