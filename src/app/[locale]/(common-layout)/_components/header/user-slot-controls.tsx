import { type ComponentProps, lazy, Suspense, useState } from "react";
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

function UserMenuButton({
	name,
	onClick,
}: {
	name: string;
	onClick: () => void;
}) {
	return (
		<button
			aria-label={name}
			className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium"
			onClick={onClick}
			type="button"
		>
			<span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
		</button>
	);
}

function DeferredUserMenu(props: ComponentProps<typeof UserMenu>) {
	const [isRequested, setIsRequested] = useState(false);
	const requestMenu = () => setIsRequested(true);

	if (!isRequested) {
		return (
			<UserMenuButton name={props.currentUser.name} onClick={requestMenu} />
		);
	}

	return (
		<Suspense
			fallback={
				<UserMenuButton name={props.currentUser.name} onClick={requestMenu} />
			}
		>
			<UserMenu {...props} />
		</Suspense>
	);
}

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
					<DeferredUserMenu currentUser={currentUser} locale={locale} />
				</>
			)}
		</Suspense>
	);
}
