import { getRouteApi } from "@tanstack/react-router";

export const pageDetailRoute = getRouteApi(
	"/$locale/_common/tipitaka_/$pageSlug",
);
