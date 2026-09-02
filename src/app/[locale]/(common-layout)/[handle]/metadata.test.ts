import { describe, expect, it } from "vite-plus/test";
import { getProfileMetadata } from "./metadata";

const pageOwner = {
	handle: "ananda",
	image: "",
	name: "Ānanda",
	profile: "",
};

describe("getProfileMetadata", () => {
	it("プロフィール未設定時の説明を要求ロケールで返す", () => {
		expect(getProfileMetadata("en", pageOwner).description).toBe(
			"Ānanda's Tipiṭaka profile. View their translation activity.",
		);
		expect(getProfileMetadata("ja", pageOwner).description).toBe(
			"ĀnandaさんのTipiṭakaプロフィール。翻訳活動を確認できます。",
		);
	});
});
