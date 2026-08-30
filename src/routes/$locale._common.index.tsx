import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/_common/")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/$locale/tipitaka",
			params: { locale: params.locale },
		});
	},
});
