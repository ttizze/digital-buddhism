import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { TipitakaFileMeta } from "../../../types";
import { getContentParts } from "./get-file-path";

const tempDirectories: string[] = [];
const fileMeta: TipitakaFileMeta = {
	fileKey: "s0101m.mul.xml",
	textLevel: "MULA",
	dirSegments: ["01-sutta", "01-digha"],
	annotationTargetFileKeys: [],
};

function createContentDirectory() {
	const baseDirectory = fs.mkdtempSync(
		path.join(os.tmpdir(), "tipitaka-parts-"),
	);
	tempDirectories.push(baseDirectory);
	const directory = path.join(baseDirectory, ...fileMeta.dirSegments);
	fs.mkdirSync(directory, { recursive: true });
	return { baseDirectory, directory };
}

afterEach(() => {
	while (tempDirectories.length > 0) {
		const directory = tempDirectories.pop();
		if (directory) fs.rmSync(directory, { recursive: true, force: true });
	}
});

describe("getContentParts", () => {
	it("分割されていない出力は元のfileKeyを維持する", () => {
		const { baseDirectory, directory } = createContentDirectory();
		fs.writeFileSync(path.join(directory, "s0101m.mul.md"), "content");

		expect(getContentParts(fileMeta, baseDirectory)).toEqual([
			{
				fileKey: "s0101m.mul.xml",
				filePath: path.join(directory, "s0101m.mul.md"),
				position: 0,
			},
		]);
	});

	it("元サイトの番号順に分割出力を返す", () => {
		const { baseDirectory, directory } = createContentDirectory();
		for (const position of [3, 1, 2]) {
			fs.writeFileSync(
				path.join(directory, `s0101m.mul${position}.md`),
				"content",
			);
		}

		expect(getContentParts(fileMeta, baseDirectory)).toEqual(
			[1, 2, 3].map((sourcePosition, position) => ({
				fileKey: `s0101m.mul${sourcePosition}.xml`,
				filePath: path.join(directory, `s0101m.mul${sourcePosition}.md`),
				position,
			})),
		);
	});

	it("分割出力と未分割出力の混在を拒否する", () => {
		const { baseDirectory, directory } = createContentDirectory();
		fs.writeFileSync(path.join(directory, "s0101m.mul.md"), "content");
		fs.writeFileSync(path.join(directory, "s0101m.mul0.md"), "content");

		expect(() => getContentParts(fileMeta, baseDirectory)).toThrow(
			"Mixed split and unsplit Tipitaka output",
		);
	});

	it("番号が欠けた分割出力を拒否する", () => {
		const { baseDirectory, directory } = createContentDirectory();
		fs.writeFileSync(path.join(directory, "s0101m.mul0.md"), "content");
		fs.writeFileSync(path.join(directory, "s0101m.mul2.md"), "content");

		expect(() => getContentParts(fileMeta, baseDirectory)).toThrow(
			"Non-contiguous Tipitaka.org parts",
		);
	});
});
