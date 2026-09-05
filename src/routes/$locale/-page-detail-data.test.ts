import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/app/_constants/public-page-cache";

const { readPageContentDataMock, setResponseHeadersMock } = vi.hoisted(() => ({
	readPageContentDataMock: vi.fn(),
	setResponseHeadersMock: vi.fn<(headers: Headers) => void>(),
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

const { getPageDetailData, getPageMarkdownData } =
	await import("./-page-detail-data");

const input = { locale: "ja", pageSlug: "vinaya-pitaka" };
const pageData = {
	pageDetail: {
		id: 1,
		slug: "vinaya-pitaka",
		title: "Vinayapiṭaka",
		textLevel: "MULA",
		parentId: null,
		position: 0,
		mdastJson: {
			type: "root",
			children: [
				{
					type: "paragraph",
					data: { hProperties: { "data-number-id": "1" } },
					children: [{ type: "text", value: "Body" }],
				},
			],
		},
		segments: [
			{
				id: 1,
				pageId: 1,
				number: 1,
				text: "Body",
				translationText: null,
				textLevel: "MULA",
				annotations: [],
			},
		],
		createdAt: new Date(0),
		updatedAt: new Date(0),
	},
	navigationData: null,
	childPages: [],
	completedTranslationLocales: [],
	description: "Body",
	annotationTypes: [],
} as const;

describe("getPageDetailData", () => {
	beforeEach(() => {
		readPageContentDataMock.mockReset().mockResolvedValue({
			metadata: {
				pageDetail: pageData.pageDetail,
				description: pageData.description,
				completedTranslationLocales: [],
			},
			content: Promise.resolve(pageData),
		});
		setResponseHeadersMock.mockReset();
	});

	it("変換済みの描画データだけを返す", async () => {
		const result = await (await getPageDetailData({ data: input }))?.content;

		expect(result?.pageDetail).not.toHaveProperty("mdastJson");
		expect(result?.pageDetail).not.toHaveProperty("segments");
		expect(result?.body).toContain("Body");
		expect(readPageContentDataMock).toHaveBeenCalledWith("vinaya-pitaka", "ja");
		const headers = setResponseHeadersMock.mock.calls[0]?.[0];
		if (!headers) throw new Error("response headers were not set");
		expect(headers.get("Cache-Control")).toBe(
			PUBLIC_PAGE_CACHE_HEADERS["Cache-Control"],
		);
		expect(headers.get("CDN-Cache-Control")).toBe(
			PUBLIC_PAGE_CACHE_HEADERS["CDN-Cache-Control"],
		);
	});

	it("Markdownはエクスポート時に生成する", async () => {
		await expect(getPageMarkdownData({ data: input })).resolves.toContain(
			"Body",
		);
		expect(readPageContentDataMock).toHaveBeenCalledWith("vinaya-pitaka", "ja");
	});
});
