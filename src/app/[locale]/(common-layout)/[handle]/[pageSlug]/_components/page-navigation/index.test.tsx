import { fireEvent, render, screen } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { vi } from "vite-plus/test";
import { TanStackSearchTestProvider } from "@/tests/tanstack-search-test-harness";
import enMessages from "../../../../../../../../messages/en.json";
import { PageNavigation } from "./index";

vi.mock(
	"@/app/[locale]/(common-layout)/_components/page-detail-route-api",
	async () => {
		const { testPageDetailRoute } =
			await import("@/tests/tanstack-search-test-harness");
		return { pageDetailRoute: testPageDetailRoute };
	},
);

describe("PageNavigation", () => {
	const tocItems = [
		{
			anchorId: "heading-1",
			level: 1,
			segment: {
				id: 1,
				pageId: 1,
				number: 1,
				text: "Heading 1",
				translationText: null,
			},
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	function renderNavigation(items = tocItems) {
		return render(
			<TanStackSearchTestProvider>
				<IntlProvider locale="en" messages={enMessages}>
					<PageNavigation
						data={null}
						locale="en"
						markdown="Hello"
						pageId={1}
						slug="test-page"
						title="Test Page"
						tocItems={items}
					/>
				</IntlProvider>
			</TanStackSearchTestProvider>,
		);
	}

	test("ページナビゲーション行にダウンロードを表示する", () => {
		renderNavigation([]);

		expect(
			screen.getByRole("button", { name: "Export markdown" }),
		).toBeInTheDocument();
	});

	test("TOCが空のときボタンが表示されない", () => {
		renderNavigation([]);

		expect(screen.queryByTitle("Table of Contents")).not.toBeInTheDocument();
	});

	test("TOCボタンのクリックで表示が切り替わる", () => {
		renderNavigation();

		expect(screen.queryByTestId("toc")).not.toBeInTheDocument();
		fireEvent.click(screen.getByTitle("Table of Contents"));
		expect(screen.getByTestId("toc")).toBeInTheDocument();
		fireEvent.click(screen.getByTitle("Table of Contents"));
		expect(screen.queryByTestId("toc")).not.toBeInTheDocument();
	});

	test("目次リンクをクリックしてもTOCは閉じない", () => {
		renderNavigation();

		fireEvent.click(screen.getByTitle("Table of Contents"));
		fireEvent.click(screen.getByRole("link", { name: "Heading 1" }));
		expect(screen.getByTestId("toc")).toBeInTheDocument();
	});
});
