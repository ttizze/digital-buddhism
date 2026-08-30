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
				<a className="flex items-center" href={`/${locale}`}>
					<span className="font-semibold text-xl">Tipiṭaka</span>
				</a>
			</div>
			<div className="flex items-center gap-4">{userSlot}</div>
		</HeaderScroll>
	);
}
