import { ClientOnly, createFileRoute, notFound } from "@tanstack/react-router";
import * as v from "valibot";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls";
import { getProfileMetadata } from "@/app/[locale]/(common-layout)/[handle]/metadata";
import { ProfilePagePresentation } from "@/app/[locale]/(common-layout)/[handle]/presentation";
import { getHandleData } from "./$locale/-handle-data";

const profileSearchSchema = v.object({
	page: v.optional(
		v.fallback(
			v.pipe(
				v.union([v.string(), v.number()]),
				v.toNumber(),
				v.integer(),
				v.minValue(1),
			),
			1,
		),
		1,
	),
});

export const Route = createFileRoute("/$locale/_common/$handle")({
	validateSearch: profileSearchSchema,
	loaderDeps: ({ search }) => ({ page: search.page }),
	loader: async ({ deps, params }) => {
		const data = await getHandleData({
			data: {
				handle: params.handle,
				locale: params.locale,
				page: deps.page,
			},
		});
		if (!data) {
			throw notFound();
		}
		return data;
	},
	head: ({ loaderData, params }) => {
		if (!loaderData) {
			return {};
		}

		const { title, description, image, alternates } = getProfileMetadata(
			params.locale,
			loaderData.pageOwner,
		);
		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "profile" },
				...(image ? [{ property: "og:image", content: image }] : []),
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
			],
			links: [
				{ rel: "canonical", href: alternates.canonical },
				...Object.entries(alternates.languages).map(([hrefLang, href]) => ({
					rel: "alternate",
					hrefLang,
					href,
				})),
			],
		};
	},
	component: ProfileRoute,
});

function ProfileRoute() {
	const { locale } = Route.useParams();
	const search = Route.useSearch();
	const data = Route.useLoaderData();

	return (
		<ProfilePagePresentation
			data={data}
			floatingControls={
				<ClientOnly fallback={null}>
					<FloatingControls sourceLocale="mixed" userLocale={locale} />
				</ClientOnly>
			}
			locale={locale}
			page={search.page}
		/>
	);
}
