import { ClientOnly, Link } from "@tanstack/react-router";
import { CircleHelp, Search } from "lucide-react";
import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { HeaderUserControlsLoading } from "./user-controls-loading";

const TranslationHelpPopover = lazy(() =>
	import("./translation-help-popover").then((module) => ({
		default: module.TranslationHelpPopover,
	})),
);
const HeaderUserControls = lazy(() =>
	import("./user-slot-controls").then((module) => ({
		default: module.HeaderUserControls,
	})),
);

export function HeaderUserSlot({ locale }: { locale: string }) {
	const t = useTranslations("Search");
	return (
		<div className="flex h-11 items-center gap-1.5 sm:gap-4">
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
				aria-label={t("linkLabel")}
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
