import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import { analyticsConsentStorageKey } from "./analytics-consent-storage";

const analyticsConsentStates = ["accepted", "rejected"] as const;
type AnalyticsConsentState = (typeof analyticsConsentStates)[number];
const analyticsConsentSchema = v.picklist(analyticsConsentStates);

export function AnalyticsConsent({
	gaTrackingId,
	locale,
	message,
}: {
	gaTrackingId: string;
	locale: string;
	message: {
		title: string;
		description: string;
		accept: string;
		decline: string;
		privacyLink: string;
	};
}) {
	const [consent, setConsent] = useState<AnalyticsConsentState | null>(null);

	useEffect(() => {
		const saved = window.localStorage.getItem(analyticsConsentStorageKey);
		const parsed = v.safeParse(analyticsConsentSchema, saved);
		setConsent(parsed.success ? parsed.output : null);
	}, []);

	useEffect(() => {
		if (consent !== "accepted" || !gaTrackingId) return;

		const externalScript = document.createElement("script");
		externalScript.async = true;
		externalScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaTrackingId)}`;
		const configScript = document.createElement("script");
		configScript.textContent = `window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config',${JSON.stringify(gaTrackingId).replaceAll("<", "\\u003c")});`;

		document.head.append(externalScript, configScript);
		return () => {
			externalScript.remove();
			configScript.remove();
		};
	}, [consent, gaTrackingId]);

	const handleAccept = () => {
		window.localStorage.setItem(analyticsConsentStorageKey, "accepted");
		setConsent("accepted");
	};

	const handleDecline = () => {
		window.localStorage.setItem(analyticsConsentStorageKey, "rejected");
		setConsent("rejected");
	};

	return (
		<>
			{consent === null && (
				<div
					className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-3 sm:w-[420px] md:bottom-5 md:right-5"
					data-analytics-consent-banner
				>
					<section
						aria-label={message.title}
						className="rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur"
					>
						<p className="font-semibold text-sm md:text-base">
							{message.title}
						</p>
						<p className="mt-2 text-muted-foreground text-xs md:text-sm">
							{message.description}{" "}
							<Link
								className="underline"
								params={{ locale }}
								to="/$locale/privacy"
							>
								{message.privacyLink}
							</Link>
						</p>
						<div className="mt-3 flex justify-end gap-2">
							<Button
								onClick={handleDecline}
								size="sm"
								type="button"
								variant="outline"
							>
								{message.decline}
							</Button>
							<Button onClick={handleAccept} size="sm" type="button">
								{message.accept}
							</Button>
						</div>
					</section>
				</div>
			)}
		</>
	);
}
