"use client";

import { authClient } from "@/app/[locale]/_service/auth-client";
import { StartButton } from "../start-button";
import { LocaleSelector } from "./locale-selector/client";
import { NotificationsDropdownClient } from "./notifications-dropdown/client";
import { HeaderUserControlsLoading } from "./user-controls-loading";
import { UserMenu } from "./user-menu.client";

export function HeaderUserControls({ locale }: { locale: string }) {
	const { data: session, isPending } = authClient.useSession();
	const currentUser = session?.user;

	if (isPending) return <HeaderUserControlsLoading />;

	return !currentUser ? (
		<>
			<LocaleSelector
				currentHandle={undefined}
				hasGeminiApiKey={false}
				localeSelectorClassName="border rounded-full w-[150px]"
				userPlan="free"
			/>
			<StartButton />
		</>
	) : (
		<>
			<NotificationsDropdownClient locale={locale} />
			<UserMenu
				currentUser={currentUser}
				hasGeminiApiKey={session.user.hasGeminiApiKey}
				locale={locale}
			/>
		</>
	);
}
