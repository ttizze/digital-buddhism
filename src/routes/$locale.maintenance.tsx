import { createFileRoute } from "@tanstack/react-router";
import MaintenancePage from "./-maintenance-page";

const metadata = {
	title: "Site Under Maintenance | MySite",
	description:
		"We're performing scheduled maintenance. Please check back soon.",
	robots: { index: false, follow: false },
};

export const Route = createFileRoute("/$locale/maintenance")({
	component: MaintenancePage,
	head: () => ({
		meta: [
			{ title: metadata.title },
			{
				name: "description",
				content: metadata.description,
			},
			{
				name: "robots",
				content: `${metadata.robots.index ? "index" : "noindex"}, ${metadata.robots.follow ? "follow" : "nofollow"}`,
			},
		],
	}),
});
