import { describe, expect, it } from "vite-plus/test";
import { markdownToMdastWithSegments } from "./markdown-to-mdast-with-segments";

describe("markdownToMdastWithSegments", () => {
	it("pb/note の記法はテキストとハッシュ入力に含まれず、pb はメタデータになる", async () => {
		const markdown = "{para:3} Hello {pb:V:1.0001} world {note:ref} end";
		const { segments } = await markdownToMdastWithSegments({ markdown });

		expect(segments).toHaveLength(1);
		expect(segments[0].text).not.toContain("<span");
		expect(segments[0].text).not.toContain("{pb");
		expect(segments[0].text).toContain("Hello");
		expect(segments[0].text).toContain("end");
		expect(segments[0].sourceParagraphNumber).toBe("3");
		expect(segments[0].metadata).toEqual({
			items: [{ typeKey: "VRI_PAGEBREAK", value: "1.0001" }],
		});
	});

	it("note の中身は本文と別扱いになり、翻訳対象テキストへ混ざらない", async () => {
		const markdown = "Hello {note:sya-thita} world";
		const { segments, mdastJson } = await markdownToMdastWithSegments({
			markdown,
		});

		expect(segments[0].text).not.toContain("sya-thita");
		// 注記そのものは MDAST には残り、表示側で描画できる
		expect(JSON.stringify(mdastJson)).toContain(
			'<span class=\\"note\\">sya-thita</span>',
		);
	});

	it("全形式の {pb} 記法からページブレークメタデータを抽出する", async () => {
		const markdown = "A {pb:M} B\n\nC {pb:1.02} D\n\nE {pb} F";
		const { segments } = await markdownToMdastWithSegments({ markdown });

		expect(segments.map((segment) => segment.metadata)).toEqual([
			{ items: [{ typeKey: "MYANMAR_PAGEBREAK", value: "" }] },
			{ items: [{ typeKey: "OTHER_PAGEBREAK", value: "1.02" }] },
			{ items: [{ typeKey: "OTHER_PAGEBREAK", value: "" }] },
		]);
	});
});
