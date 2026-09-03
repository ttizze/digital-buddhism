import {
	createFileRoute,
	Outlet,
	stripSearchParams,
} from "@tanstack/react-router";
import * as v from "valibot";
import { DEFAULT_VIEW, VIEW_VALUES } from "@/app/_constants/view";
import { Footer } from "@/app/[locale]/(common-layout)/_components/footer";
import { HeaderFrame } from "@/app/[locale]/(common-layout)/_components/header";
import { HeaderUserSlot } from "@/app/[locale]/(common-layout)/_components/header/user-slot";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";

const annotationsSearchSchema = v.pipe(
	v.union([
		v.array(v.string()),
		v.pipe(
			v.string(),
			v.transform((value) => value.split("~").filter(Boolean)),
		),
	]),
);

export const Route = createFileRoute("/$locale/_common")({
	validateSearch: v.looseObject({
		view: v.optional(
			v.fallback(v.picklist(VIEW_VALUES), DEFAULT_VIEW),
			DEFAULT_VIEW,
		),
		annotations: v.optional(v.fallback(annotationsSearchSchema, []), []),
	}),
	search: {
		middlewares: [stripSearchParams({ view: DEFAULT_VIEW, annotations: [] })],
	},
	component: CommonLayout,
});

function CommonLayout() {
	const { locale } = Route.useParams();
	const { view } = Route.useSearch();

	return (
		<>
			<OrganizationJsonLd />
			<WebSiteJsonLd locale={locale} />
			<div className="contents" data-view={view}>
				<HeaderFrame
					locale={locale}
					userSlot={<HeaderUserSlot locale={locale} />}
				/>
				<main className="mb-5 mt-3 md:mt-5 grow tracking-wider">
					<div className="container mx-auto px-4 max-w-4xl">
						<Outlet />
					</div>
				</main>
				<Footer />
			</div>
		</>
	);
}
