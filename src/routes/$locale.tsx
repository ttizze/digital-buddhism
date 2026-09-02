import { env } from "cloudflare:workers";
import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { useEffect } from "react";
import { IntlProvider } from "use-intl";
import { resolveAuthProviderAvailability } from "@/app/_constants/auth-config.server";
import { AuthProviderAvailabilityContext } from "@/app/_constants/auth-providers";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import {
	DEFAULT_MESSAGE_LOCALE,
	type MessageLocale,
} from "@/app/_constants/message-locales";
import { AnalyticsConsent } from "@/app/[locale]/_components/analytics-consent";
import { analyticsConsentStorageKey } from "@/app/[locale]/_components/analytics-consent-storage";
import { Toaster } from "@/components/ui/sonner";
import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import jaMessages from "../../messages/ja.json";
import koMessages from "../../messages/ko.json";
import zhMessages from "../../messages/zh.json";

const locales = supportedLocaleOptions.map((locale) => locale.code);
// MESSAGE_LOCALES（@/app/_constants/message-locales）と網羅一致することを型で保証する
const messages: Record<MessageLocale, typeof enMessages> = {
	en: enMessages,
	es: esMessages,
	ja: jaMessages,
	ko: koMessages,
	zh: zhMessages,
};
const analyticsConsentBootstrapScript = `try{const consent=localStorage.getItem(${JSON.stringify(analyticsConsentStorageKey)});if(consent==="accepted"||consent==="rejected")document.documentElement.dataset.analyticsConsent=consent}catch{}`;

const loadLocaleRuntimeData = createServerFn({ method: "GET" }).handler(() => ({
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
	loader: () => loadLocaleRuntimeData(),
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
	const { authProviders, gaTrackingId } = Route.useLoaderData();
	const messageLocale =
		locale in messages ? (locale as MessageLocale) : DEFAULT_MESSAGE_LOCALE;
	const localeMessages = messages[messageLocale];

	return (
		<AuthProviderAvailabilityContext.Provider value={authProviders}>
			<IntlProvider locale={locale} messages={localeMessages} timeZone="UTC">
				<NuqsAdapter>
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
				</NuqsAdapter>
			</IntlProvider>
		</AuthProviderAvailabilityContext.Provider>
	);
}
