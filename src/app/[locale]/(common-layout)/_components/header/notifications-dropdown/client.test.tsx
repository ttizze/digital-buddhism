import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import useSWR from "swr";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { NotificationJson } from "@/app/api/notifications/_types/notification";
import { NotificationsDropdownClient } from "./client";

vi.mock("use-intl", async () => {
	const { createEnTranslator } = await import("@/tests/en-translations");
	return {
		useLocale: () => "en",
		useTranslations: (namespace?: string) => createEnTranslator(namespace),
	};
});

vi.mock("swr", () => ({ default: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		children,
		className,
	}: {
		to: string;
		children?: ReactNode;
		className?: string;
	}) => (
		<a className={className} href={to}>
			{children}
		</a>
	),
}));

const sampleNotifications: NotificationJson[] = [
	{
		id: 4,
		actorId: "actor_4",
		actorHandle: "alice_jones",
		actorName: "Alice Jones",
		actorImage: "https://example.com/avatar4.png",
		read: false,
		createdAt: "2023-01-04T00:00:00.000Z",
		segmentTranslationText: "Translation Text",
		pageSlug: "page-slug-translation",
		pageTitle: "Translated Page Title",
	},
];

const user = userEvent.setup();

describe("NotificationsDropdownClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => Response.json({ success: true })),
		);
	});

	it("ベルアイコンと未読数バッジが表示される", () => {
		vi.mocked(useSWR).mockReturnValue({
			data: { notifications: sampleNotifications },
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: vi.fn(),
		});

		render(<NotificationsDropdownClient locale="en" />);

		expect(screen.getByTestId("bell-icon")).toBeInTheDocument();
		expect(screen.getByTestId("unread-count")).toHaveTextContent("1");
	});

	it("通知が存在しない場合は『No notifications』と表示される", async () => {
		vi.mocked(useSWR).mockReturnValue({
			data: { notifications: [] },
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: vi.fn(),
		});

		render(<NotificationsDropdownClient locale="en" />);

		await user.click(screen.getByTestId("bell-icon"));
		expect(screen.getByText("No notifications")).toBeInTheDocument();
	});

	it("翻訳投票通知の内容を表示する", async () => {
		vi.mocked(useSWR).mockReturnValue({
			data: { notifications: sampleNotifications },
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate: vi.fn(),
		});

		render(<NotificationsDropdownClient locale="en" />);

		await user.click(screen.getByTestId("bell-icon"));
		await waitFor(() => {
			expect(
				screen.getByTestId("notifications-menu-content"),
			).toBeInTheDocument();
		});

		expect(screen.getByText("Alice Jones")).toBeInTheDocument();
		expect(screen.getByText("Translation Text")).toBeInTheDocument();
		expect(screen.getByText("Translated Page Title")).toBeInTheDocument();
		expect(screen.getByText(/voted for/i)).toBeInTheDocument();
	});

	it("既読更新APIが失敗した場合はclient cacheを既読にしない", async () => {
		const mutate = vi.fn();
		vi.mocked(useSWR).mockReturnValue({
			data: { notifications: sampleNotifications },
			error: undefined,
			isLoading: false,
			isValidating: false,
			mutate,
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => Response.json({ error: "failed" }, { status: 500 })),
		);

		render(<NotificationsDropdownClient locale="en" />);
		await user.click(screen.getByTestId("bell-icon"));

		await waitFor(() => expect(fetch).toHaveBeenCalled());
		expect(mutate).not.toHaveBeenCalled();
	});
});
