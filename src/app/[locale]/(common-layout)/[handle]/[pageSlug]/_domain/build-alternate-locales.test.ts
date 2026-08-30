import { describe, expect, it } from "vitest";
import { BASE_URL } from "@/app/_constants/base-url";
import { buildAlternateLocales } from "./build-alternate-locales";

describe("buildAlternateLocales", () => {
	const page = { slug: "my-page" };

	it("重複するlocaleは1つにまとめられる", () => {
		const result = buildAlternateLocales({
			page,
			translatedLocales: ["ja", "ja"],
		});

		expect(result).toEqual({
			ja: `${BASE_URL}/ja/evame/my-page`,
			pi: `${BASE_URL}/pi/evame/my-page`,
		});
	});

	it("Tipitaka原文localeが翻訳情報に含まれていなくても常に含まれる", () => {
		const result = buildAlternateLocales({
			page,
			translatedLocales: ["ja", "fr"],
		});

		expect(result).toEqual({
			pi: `${BASE_URL}/pi/evame/my-page`,
			ja: `${BASE_URL}/ja/evame/my-page`,
			fr: `${BASE_URL}/fr/evame/my-page`,
		});
	});

	it("翻訳がない場合はTipitaka原文localeのみ", () => {
		const result = buildAlternateLocales({
			page,
			translatedLocales: [],
		});

		expect(result).toEqual({
			pi: `${BASE_URL}/pi/evame/my-page`,
		});
	});
});
