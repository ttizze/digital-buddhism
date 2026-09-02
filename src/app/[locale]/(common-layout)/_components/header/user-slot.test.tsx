import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";
import { HeaderUserSlot } from "./user-slot";

vi.mock("@tanstack/react-router", () => ({
	ClientOnly: ({ fallback }: { fallback: React.ReactNode }) => fallback,
	Link: ({
		"aria-label": ariaLabel,
		children,
	}: {
		"aria-label"?: string;
		children: React.ReactNode;
	}) => (
		<a aria-label={ariaLabel} href="/">
			{children}
		</a>
	),
}));

vi.mock("./translation-help-popover", () => ({
	TranslationHelpPopover: () => <button type="button">Help</button>,
}));

vi.mock("./user-slot-controls", () => ({
	HeaderUserControls: () => <button type="button">User menu</button>,
}));
vi.mock("use-intl", async () => {
	const { createEnTranslator } = await import("@/tests/en-translations");
	return {
		useTranslations: (namespace?: string) => createEnTranslator(namespace),
	};
});

describe("HeaderUserSlot", () => {
	it("SSRでもヘッダー操作とセッション読込表示を出力する", () => {
		const markup = renderToStaticMarkup(<HeaderUserSlot locale="ja" />);

		expect(markup).toContain('aria-label="Search for pages"');
		expect(markup).toContain("animate-pulse");
	});
});
