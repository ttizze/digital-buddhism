import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import * as v from "valibot";
import globalStyles from "@/app/globals.css?inline";
import {
	RootErrorComponent,
	RootNotFoundComponent,
	RoutePendingComponent,
} from "./-root-boundaries";

export const Route = createRootRoute({
	component: RootComponent,
	errorComponent: RootErrorComponent,
	notFoundComponent: RootNotFoundComponent,
	pendingComponent: RoutePendingComponent,
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{ title: "Digital Buddhism" },
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.svg",
				sizes: "any",
				type: "image/svg+xml",
			},
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
		],
	}),
	shellComponent: RootDocument,
});

function RootComponent() {
	return <Outlet />;
}

function RootDocument({ children }: { children: ReactNode }) {
	const locale = useRouterState({
		select: (state) => {
			const routeLocale = state.matches.find(
				(match) => match.routeId === "/$locale",
			)?.params.locale;
			const parsed = v.safeParse(v.string(), routeLocale);
			return parsed.success ? parsed.output : "en";
		},
	});
	const direction = locale === "ar" || locale === "fa" ? "rtl" : "ltr";

	return (
		<html dir={direction} lang={locale} suppressHydrationWarning>
			<head>
				<HeadContent />
				<style
					dangerouslySetInnerHTML={{
						__html: import.meta.env.SSR ? globalStyles : "",
					}}
					suppressHydrationWarning
				/>
			</head>
			<body className="transition-colors duration-300 antialiased">
				{children}
				<Scripts />
			</body>
		</html>
	);
}
