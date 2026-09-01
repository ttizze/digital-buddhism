import { createFileRoute } from "@tanstack/react-router";
import { buildStaticHead } from "@/app/_lib/seo-helpers";
import MaintenancePage from "./-maintenance-page";

export const Route = createFileRoute("/$locale/maintenance")({
	component: MaintenancePage,
	head: () =>
		buildStaticHead({
			title: "Site Under Maintenance | MySite",
			description:
				"We're performing scheduled maintenance. Please check back soon.",
			robots: { index: false, follow: false },
		}),
});
