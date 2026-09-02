import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";
import {
	RootErrorComponent,
	RootNotFoundComponent,
	RoutePendingComponent,
} from "./-root-boundaries";

const { captureBrowserExceptionMock } = vi.hoisted(() => ({
	captureBrowserExceptionMock: vi.fn(),
}));

vi.mock("@/instrument", () => ({
	captureBrowserException: captureBrowserExceptionMock,
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params,
		to,
	}: {
		children: ReactNode;
		params?: { locale?: string };
		to: string;
	}) => (
		<a
			href={
				to.startsWith("/$locale")
					? to.replace("/$locale", `/${params?.locale}`)
					: to
			}
		>
			{children}
		</a>
	),
}));

describe("TanStack Startのroot境界UI", () => {
	it("エラー内容を表示し、再試行とホーム遷移を提供する", async () => {
		const reset = vi.fn();
		const user = userEvent.setup();
		const error = Object.assign(new Error("読み込みに失敗しました"), {
			digest: "error-123",
		});

		render(<RootErrorComponent error={error} reset={reset} />);

		await vi.waitFor(() => {
			expect(captureBrowserExceptionMock).toHaveBeenCalledWith(error);
		});
		expect(screen.getByText("Error")).toBeInTheDocument();
		expect(screen.getByText("Error code:")).toBeInTheDocument();
		expect(screen.getByText("error-123")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute(
			"href",
			"/",
		);

		await user.click(screen.getByRole("button", { name: "Try again" }));
		expect(reset).toHaveBeenCalledOnce();
	});

	it("404画面に英語ホームと検索へのリンクを表示する", () => {
		render(<RootNotFoundComponent />);

		expect(screen.getByText("404")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute(
			"href",
			"/en/tipitaka",
		);
		expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute(
			"href",
			"/en/search",
		);
	});

	it("保留中はspinnerを使わず画面上端の進捗バーを表示する", () => {
		render(<RoutePendingComponent />);

		const progress = screen.getByRole("progressbar");
		expect(progress).toHaveAttribute("aria-label", "Loading");
		expect(progress.querySelector("svg")).toBeNull();
	});
});
