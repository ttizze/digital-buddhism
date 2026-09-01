import { describe, expect, it } from "vitest";
import { getRouter } from "./router";

const router = getRouter();

function expectRouteToMatch(pathname: string, routeId: string) {
	const matchedRouteIds = router
		.matchRoutes(pathname)
		.map((match) => match.routeId);

	expect(matchedRouteIds).toContain(routeId);
}

describe("TanStack StartのAPIルート登録", () => {
	it("/api/locale-info が実際のルートツリーでマッチする", () => {
		expectRouteToMatch("/api/locale-info", "/api/locale-info");
	});

	it("/api/og が実際のルートツリーでマッチする", () => {
		expectRouteToMatch("/api/og", "/api/og");
	});
});

describe("TanStack Startの認証ルート登録", () => {
	it("/auth/login がマッチする", () => {
		expectRouteToMatch("/auth/login", "/auth/login");
	});
});

describe("復元した画面ルートの登録", () => {
	it("/en が共通レイアウトのホーム画面へマッチする", () => {
		expectRouteToMatch("/en", "/$locale/_common/");
	});
});
