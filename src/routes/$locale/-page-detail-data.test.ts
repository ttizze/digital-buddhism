import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";

const { readPageContentDataMock, setResponseHeadersMock } = vi.hoisted(() => ({
	readPageContentDataMock: vi.fn(),
	setResponseHeadersMock: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		const builder = {
			validator: () => builder,
			handler: <T>(handler: T) => handler,
		};
		return builder;
	},
}));
vi.mock("@tanstack/react-start/server", () => ({
	setResponseHeaders: setResponseHeadersMock,
}));
vi.mock(
	"@/app/[locale]/_infrastructure/tipitaka-read-model/reader.server",
	() => ({ readPageContentData: readPageContentDataMock }),
);

const { getPageDetailData } = await import("./-page-detail-data");

const input = { locale: "en", handle: "owner", pageSlug: "not-tipitaka" };

describe("getPageDetailData", () => {
	beforeEach(() => {
		readPageContentDataMock.mockReset().mockResolvedValue({
			pageDetail: { id: 1 },
		});
		setResponseHeadersMock.mockReset();
	});

	it("Tipitakaシステムhandle以外は取得しない", async () => {
		await expect(getPageDetailData({ data: input })).resolves.toBeNull();
		expect(readPageContentDataMock).not.toHaveBeenCalled();
		const headers = setResponseHeadersMock.mock.calls[0]?.[0] as Headers;
		expect(headers.get("Cache-Control")).toBe(
			PUBLIC_PAGE_CACHE_HEADERS["Cache-Control"],
		);
		expect(headers.get("CDN-Cache-Control")).toBe(
			PUBLIC_PAGE_CACHE_HEADERS["CDN-Cache-Control"],
		);
	});

	it("可視なTipitakaページを表示する", async () => {
		readPageContentDataMock.mockResolvedValue({ pageDetail: { id: 1 } });

		await expect(
			getPageDetailData({
				data: { locale: "ja", handle: "tipitaka", pageSlug: "vinaya-pitaka" },
			}),
		).resolves.toEqual({ pageDetail: { id: 1 } });
		expect(readPageContentDataMock).toHaveBeenCalledWith("vinaya-pitaka", "ja");
		expect(setResponseHeadersMock).toHaveBeenCalledOnce();
	});
});
