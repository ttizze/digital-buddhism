import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseBooksJson } from "./books";
import { BOOKS_JSON_PATH } from "./constants";

describe("parseBooksJson", () => {
	it("loads every official page and all explicit annotation targets", async () => {
		const fileMetas = parseBooksJson(await readFile(BOOKS_JSON_PATH, "utf8"));
		const byFileKey = new Map(
			fileMetas.map((fileMeta) => [fileMeta.fileKey, fileMeta]),
		);

		expect(fileMetas).toHaveLength(217);
		expect(
			fileMetas.reduce(
				(count, fileMeta) => count + fileMeta.annotationTargetFileKeys.length,
				0,
			),
		).toBe(125);
		expect(byFileKey.get("vin02t.tik.xml")?.annotationTargetFileKeys).toEqual([
			"vin02m1.mul.xml",
			"vin02m2.mul.xml",
			"vin02m3.mul.xml",
			"vin02m4.mul.xml",
			"vin02a1.att.xml",
			"vin02a2.att.xml",
			"vin02a3.att.xml",
			"vin02a4.att.xml",
		]);
		expect(byFileKey.get("s0101t.tik.xml")?.annotationTargetFileKeys).toEqual([
			"s0101m.mul.xml",
			"s0101a.att.xml",
		]);
	});

	it("rejects a relation that violates the text-level hierarchy", () => {
		expect(() =>
			parseBooksJson(
				JSON.stringify({
					generatedAt: "2026-01-01T00:00:00.000Z",
					count: 2,
					data: {
						"mula.xml": {
							level: "Mula",
							dirSegments: ["01-Mula"],
							annotationTargetFileNames: ["tika.xml"],
						},
						"tika.xml": {
							level: "Tika",
							dirSegments: ["03-Tika"],
							annotationTargetFileNames: [],
						},
					},
				}),
			),
		).toThrow(/Invalid annotation level relation/);
	});
});
