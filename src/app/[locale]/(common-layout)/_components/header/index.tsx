import { Link } from "@tanstack/react-router";
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
				<Link
					aria-label="Digital Buddhism"
					className="flex items-center gap-2"
					params={{ locale }}
					to="/$locale/tipitaka"
				>
					<img
						alt=""
						className="size-8 shrink-0 dark:invert"
						src="/brand-icon.svg"
					/>
					<span className="hidden font-semibold text-xl sm:inline">
						Digital Buddhism
					</span>
				</Link>
			</div>
			<div className="flex items-center gap-4">{userSlot}</div>
		</HeaderScroll>
	);
}
