import { renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import type { TranslationJobForToast } from "@/app/types/translation-job";
import { useTranslationJobToast } from "./use-translation-job-toast";

// 🔧 sonner をモック：toast() が id を返し console に描画しないように
vi.mock("sonner", () => {
	let id = 0;
	return {
		toast: vi.fn((_jsx, opts: { id?: number } = {}) => opts?.id ?? ++id),
		dismiss: vi.fn(),
	};
});

const pendingJobs: TranslationJobForToast[] = [
	{
		id: 1,
		locale: "en",
		status: "PENDING",
		progress: 0,
		error: "",
		page: { slug: "test-page" },
	},
	{
		id: 2,
		locale: "ja",
		status: "IN_PROGRESS",
		progress: 30,
		error: "",
		page: { slug: "test-page" },
	},
];

const completedJobs: TranslationJobForToast[] = [
	{
		id: 1,
		locale: "en",
		status: "COMPLETED",
		progress: 100,
		error: "",
		page: { slug: "test-page" },
	},
	{
		id: 2,
		locale: "ja",
		status: "COMPLETED",
		progress: 100,
		error: "",
		page: { slug: "test-page" },
	},
];

describe("useTranslationToast", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates toast once on first non-empty jobs list", () => {
		renderHook(() => useTranslationJobToast(pendingJobs));
		expect(toast).toHaveBeenCalledTimes(2); // 生成
	});

	it("updates the same toast id on jobs change", () => {
		const { rerender } = renderHook(
			({ jobs }) => useTranslationJobToast(jobs),
			{
				initialProps: { jobs: pendingJobs },
			},
		);

		const toastMock = toast as unknown as Mock;
		const firstId = toastMock.mock.results[0].value;
		expect(firstId).toBeDefined();

		// ⏩ 進捗更新
		rerender({ jobs: completedJobs });

		// toast が同じ id で 2 回目呼ばれる
		expect(toast).toHaveBeenCalledTimes(3);
		const secondId = toastMock.mock.results[1].value;
		expect(secondId).toBe(firstId);
	});

	it("closes after all jobs done (duration 3000)", () => {
		renderHook(() => useTranslationJobToast(completedJobs));
		const toastMock = toast as unknown as Mock;
		const call = toastMock.mock.calls.at(-1); // 最後の呼び出し
		expect(call).toBeDefined();
		if (!call) throw new Error("toast was not called");
		const opts = call[1];
		expect(opts.duration).toBe(3000);
	});
	it("keeps toast open for long-running jobs", () => {
		const { rerender } = renderHook(
			({ jobs }) => useTranslationJobToast(jobs),
			{ initialProps: { jobs: pendingJobs } },
		);

		// 進捗を更新
		const inProgressJobs = pendingJobs.map((job, index) =>
			index === 0 ? { ...job, progress: 50 } : job,
		);
		rerender({ jobs: inProgressJobs });

		const toastMock = toast as unknown as Mock;
		const call = toastMock.mock.calls.at(-1);
		expect(call).toBeDefined();
		if (!call) throw new Error("toast was not called");
		const opts = call[1];
		expect(opts.duration).toBe(Number.POSITIVE_INFINITY);
	});
});
