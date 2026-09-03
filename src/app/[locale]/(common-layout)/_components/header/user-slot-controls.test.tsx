import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { HeaderUserControls } from "./user-slot-controls";

const { useSessionMock } = vi.hoisted(() => ({
	useSessionMock: vi.fn(),
}));

vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: { useSession: useSessionMock },
}));

vi.mock("../start-button", () => ({
	StartButton: () => <button type="button">Start</button>,
}));

vi.mock("./locale-selector/client", () => ({
	LocaleSelector: () => <button type="button">Locale</button>,
}));

vi.mock("./notifications-dropdown/client", () => ({
	NotificationsDropdownClient: () => (
		<button type="button">Notifications</button>
	),
}));

vi.mock("./user-menu", () => ({
	UserMenu: () => <button type="button">User menu</button>,
}));

describe("HeaderUserControls", () => {
	beforeEach(() => {
		useSessionMock.mockReset();
	});

	it("セッション取得中は読込表示を保つ", () => {
		useSessionMock.mockReturnValue({ data: null, isPending: true });

		const { container } = render(<HeaderUserControls locale="ja" />);

		expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
	});

	it("認証済みなら通知とユーザーメニューを表示する", async () => {
		useSessionMock.mockReturnValue({
			data: {
				user: {
					handle: "tomoki",
					image: "https://example.com/avatar.jpg",
					name: "Tomoki",
					plan: "free",
				},
			},
			isPending: false,
		});

		render(<HeaderUserControls locale="ja" />);

		expect(
			await screen.findByRole("button", { name: "Notifications" }),
		).toBeVisible();
		expect(screen.queryByRole("button", { name: "User menu" })).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Tomoki" }));

		expect(
			await screen.findByRole("button", { name: "User menu" }),
		).toBeVisible();
	});

	it("未認証なら言語選択と開始ボタンを表示する", async () => {
		useSessionMock.mockReturnValue({ data: null, isPending: false });

		render(<HeaderUserControls locale="ja" />);

		expect(await screen.findByRole("button", { name: "Locale" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Start" })).toBeVisible();
	});
});
