import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vite-plus/test";
import type { PageContentBody } from "../../_domain/page-content-view";
import { usePageSegmentGlosses } from "./use-page-segment-glosses";

type AuthState = { userId: string | null };
const auth = vi.hoisted((): AuthState => ({ userId: null }));
vi.mock("@/app/[locale]/_service/auth-client", () => ({
	authClient: {
		useSession: () => ({
			data: auth.userId ? { user: { id: auth.userId } } : null,
		}),
	},
}));
afterEach(() => {
	vi.unstubAllGlobals();
	auth.userId = null;
});

it("匿名表示は公開語義を使い、ログイン時だけ票を取得してログアウト時に破棄する", async () => {
	const unit = {
		id: 1,
		segmentId: 2,
		position: 0,
		startOffset: 0,
		endOffset: 6,
		surface: "Dhamma",
		gloss: "法",
		point: 0,
		currentUserVoteIsUpvote: null,
	};
	const body: PageContentBody = [
		[2, 0, null, null, "Dhamma", null, [unit]],
		[],
	];
	const fetcher = vi.fn(async () =>
		Response.json([{ id: 1, point: 3, currentUserVoteIsUpvote: true }]),
	);
	vi.stubGlobal("fetch", fetcher);
	const cache = new Map();
	const { result, rerender } = renderHook(
		() => usePageSegmentGlosses(1, "ja", body),
		{
			wrapper: ({ children }) => (
				<SWRConfig value={{ provider: () => cache }}>{children}</SWRConfig>
			),
		},
	);
	expect(result.current.data).toEqual([unit]);
	expect(fetcher).not.toHaveBeenCalled();
	auth.userId = "reader";
	rerender();
	await waitFor(() =>
		expect(result.current.data?.[0]?.currentUserVoteIsUpvote).toBe(true),
	);
	expect(result.current.data?.[0]?.gloss).toBe("法");
	expect(fetcher).toHaveBeenCalledTimes(1);
	auth.userId = null;
	rerender();
	expect(result.current.data).toEqual([unit]);
});
