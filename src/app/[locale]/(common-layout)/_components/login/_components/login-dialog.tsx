import { Link, useLocation } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { useAuthProviderAvailability } from "@/app/_constants/auth-providers";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { GoogleForm } from "./google-form";
import { MagicLinkForm } from "./magic-link-form";

interface LoginDialogProps {
	/**
	 * React element that will act as the dialog trigger (e.g. a button).
	 */
	trigger: ReactNode;
	/**
	 * Whether the dialog should be open by default.
	 */
	open?: boolean;
}

/**
 * Wraps the existing <Login /> component in a Radix-powered dialog so that the
 * login flow can be presented modally from anywhere in the app.
 */
export function LoginDialog({
	trigger,
	open: defaultOpen = false,
}: LoginDialogProps) {
	const [open, setOpen] = useState(defaultOpen);
	const locale = useLocale();
	const t = useTranslations("LoginDialog");
	const authProviders = useAuthProviderAvailability();
	const redirectTo = useLocation({
		select: (location) => `${location.pathname}${location.searchStr}`,
	});
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			{/* We set max-w because the underlying <Login /> already has its own container width. */}
			<DialogContent className="max-w-md ">
				<DialogTitle className="text-center font-bold text-2xl">
					{t("title")}
					<DialogDescription className="mt-2">
						{t("description")}
					</DialogDescription>
				</DialogTitle>
				{authProviders.google && <GoogleForm redirectTo={redirectTo} />}
				{authProviders.google && authProviders.magicLink && (
					<>
						<Separator className="my-4" />
						<div className="text-center text-sm text-gray-500 my-2">
							{t("continueWithEmail")}
						</div>
					</>
				)}
				{authProviders.magicLink && <MagicLinkForm redirectTo={redirectTo} />}
				{!authProviders.google && !authProviders.magicLink && (
					<p className="text-center text-sm text-muted-foreground">
						{t("notConfigured")}
					</p>
				)}
				<div className="text-center text-sm text-gray-500 my-2">
					{t.rich("agreement", {
						terms: (children) => (
							<Link
								className="underline"
								params={{ locale }}
								to="/$locale/terms"
							>
								{children}
							</Link>
						),
						privacy: (children) => (
							<Link
								className="underline"
								params={{ locale }}
								to="/$locale/privacy"
							>
								{children}
							</Link>
						),
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}
