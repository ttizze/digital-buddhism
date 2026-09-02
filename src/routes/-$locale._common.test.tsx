import { render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

const { registeredRoute } = vi.hoisted(() => ({
	registeredRoute: {
		component: undefined as ComponentType | undefined,
	},
}));

vi.mock("@tanstack/react-router", () => ({
	ClientOnly: ({ fallback }: { fallback: ReactNode }) => fallback,
	createFileRoute: () => (config: { component: ComponentType }) => {
		registeredRoute.component = config.component;
		return {
			useParams: () => ({ locale: "ja" }),
			useSearch: () => ({ view: "source" }),
		};
	},
	Outlet: () => <div>Page</div>,
	stripSearchParams: () => () => ({}),
}));

vi.mock("@/app/[locale]/(common-layout)/_components/footer", () => ({
	Footer: () => <footer />,
}));

vi.mock("@/app/[locale]/(common-layout)/_components/header", () => ({
	HeaderFrame: ({ userSlot }: { userSlot: ReactNode }) => (
		<header>{userSlot}</header>
	),
}));

vi.mock("@/app/[locale]/(common-layout)/_components/header/user-slot", () => ({
	HeaderUserSlot: () => <button type="button">User menu</button>,
}));

vi.mock(
	"@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-form-on-click",
	() => ({ TranslationFormOnClick: () => null }),
);

vi.mock("@/components/seo/json-ld", () => ({
	OrganizationJsonLd: () => null,
	WebSiteJsonLd: () => null,
}));

import "./$locale._common";

describe("共通レイアウトのヘッダー", () => {
	it("SSR fallback中もユーザースロットを欠落させない", () => {
		const CommonLayout = registeredRoute.component;
		if (!CommonLayout) throw new Error("共通レイアウトが登録されていません");

		render(<CommonLayout />);

		expect(
			screen.getByRole("button", { name: "User menu" }),
		).toBeInTheDocument();
		expect(screen.getByRole("main").closest("[data-view]")).toHaveAttribute(
			"data-view",
			"source",
		);
	});
});
