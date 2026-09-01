import { createFileRoute } from "@tanstack/react-router";
import { buildStaticHead } from "@/app/_lib/seo-helpers";
import TermsPage from "./-terms-page";

export const Route = createFileRoute("/$locale/terms")({
	component: TermsPage,
	head: () =>
		buildStaticHead({
			title: "Terms of Service | Tipiṭaka",
			description:
				"Tipiṭaka Terms of Service. Learn about user responsibilities, content licensing, and platform usage guidelines.",
			robots: { index: true, follow: true },
		}),
});
