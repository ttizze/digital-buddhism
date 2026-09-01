import { createFileRoute } from "@tanstack/react-router";
import { buildStaticHead } from "@/app/_lib/seo-helpers";
import PrivacyPolicyPage from "./-privacy-policy-page";

export const Route = createFileRoute("/$locale/privacy")({
	component: PrivacyPolicyPage,
	head: () =>
		buildStaticHead({
			title: "Privacy Policy | Tipiṭaka",
			description:
				"Tipiṭaka Privacy Policy. Learn how we collect, use, and protect your personal data.",
			robots: { index: true, follow: true },
		}),
});
