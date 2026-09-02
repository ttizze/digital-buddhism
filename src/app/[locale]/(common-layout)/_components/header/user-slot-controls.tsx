import { lazy, Suspense } from "react";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { HeaderUserControlsLoading } from "./user-controls-loading";

const StartButton = lazy(() =>
	import("../start-button").then((module) => ({
		default: module.StartButton,
	})),
);
const LocaleSelector = lazy(() =>
	import("./locale-selector/client").then((module) => ({
		default: module.LocaleSelector,
	})),
);
const NotificationsDropdownClient = lazy(() =>
	import("./notifications-dropdown/client").then((module) => ({
		default: module.NotificationsDropdownClient,
	})),
);
const UserMenu = lazy(() =>
	import("./user-menu").then((module) => ({
		default: module.UserMenu,
	})),
);

export function HeaderUserControls({ locale }: { locale: string }) {
	const { data: session, isPending } = authClient.useSession();
	const currentUser = session?.user;

	if (isPending) return <HeaderUserControlsLoading />;

	return (
		<Suspense fallback={<HeaderUserControlsLoading />}>
			{!currentUser ? (
				<>
					<LocaleSelector
						currentHandle={undefined}
						localeSelectorClassName="border rounded-full w-[150px]"
						userPlan="free"
					/>
					<StartButton />
				</>
			) : (
				<>
					<NotificationsDropdownClient locale={locale} />
					<UserMenu currentUser={currentUser} locale={locale} />
				</>
			)}
		</Suspense>
	);
}
