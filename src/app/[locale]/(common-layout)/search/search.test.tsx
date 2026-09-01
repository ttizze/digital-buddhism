import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchPageClient } from "./search";

const { navigate } = vi.hoisted(() => ({
	navigate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
}));

describe("SearchPageClient", () => {
	beforeEach(() => {
		navigate.mockClear();
	});

	it("入力中は遷移せず、submit時だけ検索条件を更新する", async () => {
		const user = userEvent.setup();
		render(<SearchPageClient category="title" locale="ja" query="" />);

		const input = screen.getByRole("searchbox");
		await user.type(input, "dhamma");
		expect(navigate).not.toHaveBeenCalled();

		await user.keyboard("{Enter}");
		await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));

		const options = navigate.mock.calls[0]?.[0];
		expect(options).toMatchObject({
			params: { locale: "ja" },
			to: "/$locale/search",
		});
		expect(options.search({ view: "both" })).toEqual({
			category: "title",
			page: 1,
			query: "dhamma",
			view: "both",
		});
	});
});
