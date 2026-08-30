import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicyPage from "./-privacy-policy-page";

const metadata = {
	title: "Privacy Policy | Tipiṭaka",
	description:
		"Tipiṭaka Privacy Policy. Learn how we collect, use, and protect your personal data.",
	robots: { index: true, follow: true },
};

export const Route = createFileRoute("/$locale/privacy")({
	component: PrivacyPolicyPage,
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
