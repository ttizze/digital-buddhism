import {
	ClientOnly,
	createFileRoute,
	notFound,
	Outlet,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { useEffect } from "react";
import { IntlProvider } from "use-intl";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { AnalyticsConsent } from "@/app/[locale]/_components/analytics-consent.client";
import { Toaster } from "@/components/ui/sonner";
import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import jaMessages from "../../messages/ja.json";
import koMessages from "../../messages/ko.json";
import zhMessages from "../../messages/zh.json";

const locales = supportedLocaleOptions.map((locale) => locale.code);
const messages = {
	en: enMessages,
	es: esMessages,
	ja: jaMessages,
	ko: koMessages,
	zh: zhMessages,
};
const cookieConsentMessageLocales = new Set(["en", "ja", "es", "ko", "zh"]);

const loadLocaleRuntimeData = createServerFn({ method: "GET" }).handler(() => ({
	gaTrackingId: process.env.GOOGLE_ANALYTICS_ID ?? "",
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
	loader: () => loadLocaleRuntimeData(),
	component: LocaleShell,
});

function LocalePreference({ locale }: { locale: string }) {
	useEffect(() => {
		const localeCookie = `NEXT_LOCALE=${encodeURIComponent(locale)}`;
		if (!document.cookie.split("; ").includes(localeCookie)) {
			// biome-ignore lint/suspicious/noDocumentCookie: The locale preference must also work where Cookie Store is unavailable.
			document.cookie = `${localeCookie}; Path=/; SameSite=Lax`;
		}
	}, [locale]);

	return null;
}

function LocaleShell() {
	const { locale } = Route.useParams();
	const { gaTrackingId } = Route.useLoaderData();
	const messageLocale = locale in messages ? locale : "en";
	const localeMessages = messages[messageLocale as keyof typeof messages];
	const consentMessageLocale = cookieConsentMessageLocales.has(locale)
		? locale
		: "en";
	const consentMessages =
		messages[consentMessageLocale as keyof typeof messages].CookieConsent;

	return (
		<IntlProvider locale={locale} messages={localeMessages} timeZone="UTC">
			<NuqsAdapter>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<LocalePreference locale={locale} />
					<ClientOnly fallback={null}>
						<AnalyticsConsent
							gaTrackingId={gaTrackingId}
							locale={locale}
							message={consentMessages}
						/>
					</ClientOnly>
					<Outlet />
					<Toaster closeButton richColors />
				</ThemeProvider>
			</NuqsAdapter>
		</IntlProvider>
	);
}
