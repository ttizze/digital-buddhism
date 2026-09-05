import { env } from "cloudflare:workers";
import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { IntlProvider } from "use-intl";
import { resolveAuthProviderAvailability } from "@/app/_constants/auth-config.server";
import { AuthProviderAvailabilityContext } from "@/app/_constants/auth-providers";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { getMessages } from "@/app/_constants/messages.server";
import { supportedLocaleSchema } from "./$locale/-supported-locale-schema";
import { AnalyticsConsent } from "@/app/[locale]/_components/analytics-consent";
import { analyticsConsentStorageKey } from "@/app/[locale]/_components/analytics-consent-storage";
import { Toaster } from "@/components/ui/sonner";

const locales = supportedLocaleOptions.map((locale) => locale.code);
const analyticsConsentBootstrapScript = `try{const consent=localStorage.getItem(${JSON.stringify(analyticsConsentStorageKey)});if(consent==="accepted"||consent==="rejected")document.documentElement.dataset.analyticsConsent=consent}catch{}`;

const loadLocaleRuntimeData = createServerFn({ method: "GET" })
	.validator(supportedLocaleSchema)
	.handler(({ data: locale }) => ({
		localeMessages: getMessages(locale),
		authProviders: resolveAuthProviderAvailability(env),
		gaTrackingId: env.GOOGLE_ANALYTICS_ID ?? "",
	}));

export const Route = createFileRoute("/$locale")({
	params: {
		parse: (params) => {
			if (!locales.includes(params.locale)) {
				throw notFound();
			}

			return params;
		},
	},
	staleTime: Infinity,
	loader: ({ params }) => loadLocaleRuntimeData({ data: params.locale }),
	component: LocaleShell,
});

function LocalePreference({ locale }: { locale: string }) {
	useEffect(() => {
		const localeCookie = `NEXT_LOCALE=${encodeURIComponent(locale)}`;
		if (!document.cookie.split("; ").includes(localeCookie)) {
			document.cookie = `${localeCookie}; Path=/; SameSite=Lax`;
		}
	}, [locale]);

	return null;
}

function LocaleShell() {
	const { locale } = Route.useParams();
	const { authProviders, gaTrackingId, localeMessages } = Route.useLoaderData();

	return (
		<AuthProviderAvailabilityContext.Provider value={authProviders}>
			<IntlProvider locale={locale} messages={localeMessages} timeZone="UTC">
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<LocalePreference locale={locale} />
					<script>{analyticsConsentBootstrapScript}</script>
					<AnalyticsConsent
						gaTrackingId={gaTrackingId}
						locale={locale}
						message={localeMessages.CookieConsent}
					/>
					<Outlet />
					<Toaster closeButton richColors />
				</ThemeProvider>
			</IntlProvider>
		</AuthProviderAvailabilityContext.Provider>
	);
}
