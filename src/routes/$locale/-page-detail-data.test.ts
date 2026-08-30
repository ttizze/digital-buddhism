import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	getCurrentUserFromHeadersMock,
	loadPageContentDataMock,
	queryPageDetailMock,
	setResponseHeaderMock,
} = vi.hoisted(() => ({
	getCurrentUserFromHeadersMock: vi.fn(),
	loadPageContentDataMock: vi.fn(),
	queryPageDetailMock: vi.fn(),
	setResponseHeaderMock: vi.fn(),
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
	getRequestHeaders: () => new Headers(),
	setResponseHeader: setResponseHeaderMock,
}));
vi.mock("@/app/[locale]/_db/queries", () => ({
	queryPageDetail: queryPageDetailMock,
}));
vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: getCurrentUserFromHeadersMock,
}));
vi.mock(
	"@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_service/load-page-content-data",
	() => ({ loadPageContentData: loadPageContentDataMock }),
);

const { getPageDetailData } = await import("./-page-detail-data");

const input = { locale: "en", handle: "owner", pageSlug: "not-tipitaka" };

describe("getPageDetailData", () => {
	beforeEach(() => {
		queryPageDetailMock.mockReset().mockResolvedValue({
			id: 1,
			segments: [{ number: 0 }],
		});
		getCurrentUserFromHeadersMock.mockReset();
		loadPageContentDataMock.mockReset().mockResolvedValue({ pageDetail: {} });
		setResponseHeaderMock.mockReset();
	});

	it("Tipitakaシステムhandle以外は取得しない", async () => {
		await expect(getPageDetailData({ data: input })).resolves.toBeNull();
		expect(queryPageDetailMock).not.toHaveBeenCalled();
		expect(getCurrentUserFromHeadersMock).not.toHaveBeenCalled();
		expect(setResponseHeaderMock).toHaveBeenCalledWith(
			"Cache-Control",
			"public, max-age=60, stale-while-revalidate=300",
		);
	});

	it("可視なTipitakaページを表示する", async () => {
		queryPageDetailMock.mockResolvedValue({
			id: 1,
			segments: [{ number: 0 }],
		});
		loadPageContentDataMock.mockResolvedValue({ pageDetail: { id: 1 } });

		await expect(
			getPageDetailData({
				data: { locale: "ja", handle: "tipitaka", pageSlug: "vinaya-pitaka" },
			}),
		).resolves.toEqual({ pageDetail: { id: 1 } });
		expect(getCurrentUserFromHeadersMock).not.toHaveBeenCalled();
	});
});
