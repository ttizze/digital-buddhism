import { ClientOnly, Link } from "@tanstack/react-router";
import { CircleHelp, Search } from "lucide-react";
import { lazy, Suspense } from "react";
import { HeaderUserControlsLoading } from "./user-controls-loading";

const TranslationHelpPopover = lazy(() =>
	import("./translation-help-popover.client").then((module) => ({
		default: module.TranslationHelpPopover,
	})),
);
const HeaderUserControls = lazy(() =>
	import("./user-slot.client").then((module) => ({
		default: module.HeaderUserControls,
	})),
);

export function HeaderUserSlot({ locale }: { locale: string }) {
	return (
		<div className="flex items-center gap-4">
			<ClientOnly
				fallback={<CircleHelp aria-hidden="true" className="h-6 w-6" />}
			>
				<Suspense
					fallback={<CircleHelp aria-hidden="true" className="h-6 w-6" />}
				>
					<TranslationHelpPopover />
				</Suspense>
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
				<Suspense fallback={<HeaderUserControlsLoading />}>
					<HeaderUserControls locale={locale} />
				</Suspense>
			</ClientOnly>
		</div>
	);
}
