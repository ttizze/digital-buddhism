import { createFileRoute } from "@tanstack/react-router";
import TermsPage from "./-terms-page";

const metadata = {
	title: "Terms of Service | Tipiṭaka",
	description:
		"Tipiṭaka Terms of Service. Learn about user responsibilities, content licensing, and platform usage guidelines.",
	robots: { index: true, follow: true },
};

export const Route = createFileRoute("/$locale/terms")({
	component: TermsPage,
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
