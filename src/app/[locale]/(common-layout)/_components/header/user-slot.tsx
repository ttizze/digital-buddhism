import { ClientOnly, Link } from "@tanstack/react-router";
import { CircleHelp, Search } from "lucide-react";
import { TranslationHelpPopover } from "./translation-help-popover.client";
import { HeaderUserControlsLoading } from "./user-controls-loading";
import { HeaderUserControls } from "./user-slot.client";

export function HeaderUserSlot({ locale }: { locale: string }) {
	return (
		<div className="flex items-center gap-4">
			<ClientOnly
				fallback={<CircleHelp aria-hidden="true" className="h-6 w-6" />}
			>
				<TranslationHelpPopover />
			</ClientOnly>
			<Link
				aria-label="Search for pages"
				params={{ locale }}
				preload={false}
				to="/$locale/search"
			>
				<Search className="h-6 w-6" />
			</Link>
			<ClientOnly fallback={<HeaderUserControlsLoading />}>
				<HeaderUserControls locale={locale} />
			</ClientOnly>
		</div>
	);
}
