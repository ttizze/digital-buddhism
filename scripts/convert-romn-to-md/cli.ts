import * as fs from "node:fs";
import * as path from "node:path";

import { DOMParser } from "@xmldom/xmldom";
import { getFileData } from "./books";
import { writeBookMarkdown } from "./render";
import { getChildElements } from "./tei";
import type { BookDoc, SiteTocEntry } from "./types";

const fsPromises = fs.promises;

function parseXml(contents: string) {
	const parser = new DOMParser({ errorHandler: () => undefined });
	return parser.parseFromString(
		contents.replace(/^\uFEFF/, ""),
		"application/xml",
	);
}

function readSiteTocEntries(fileName: string): SiteTocEntry[] {
	const tocPath = path.resolve(
		process.cwd(),
		"tipitaka-xml",
		"tipitaka.org",
		"romn",
		"cscd",
		`${fileName.slice(0, -path.extname(fileName).length)}.toc.xml`,
	);
	const document = parseXml(fs.readFileSync(tocPath, "utf16le"));
	return Array.from(document.getElementsByTagName("tree"))
		.filter((element) => element.hasAttribute("action"))
		.map((element) => {
			const title = element.getAttribute("text")?.trim();
			const action = element.getAttribute("action");
			if (!title || !action) {
				throw new Error(`Invalid Tipitaka.org TOC entry in ${tocPath}`);
			}
			return {
				title,
				outputFileName: `${path.basename(action, path.extname(action))}.md`,
			};
		});
}

export async function convertXmlFileToMarkdown(
	filePath: string,
	outputDir: string,
): Promise<void> {
	const xmlContent = await fsPromises.readFile(filePath, "utf16le");
	const document = parseXml(xmlContent);
	const bodies = document.getElementsByTagName("body");
	const body = bodies.item(0);
	if (!body) throw new Error(`No <body> found in ${filePath}`);
	if (bodies.length > 1)
		throw new Error(`Multiple <body> found in ${filePath}`);

	const lower = path.basename(filePath).toLowerCase();
	const own = getFileData(lower);

	const doc: BookDoc = {
		nodes: getChildElements(body),
		dirSegments: [...own.dirSegments],
	};

	writeBookMarkdown(
		doc,
		outputDir,
		readSiteTocEntries(path.basename(filePath)),
	);
}

export async function runConversionCli(): Promise<void> {
	const inputDir = path.resolve(process.cwd(), "tipitaka-xml/romn");
	const outputDir = path.resolve(process.cwd(), "tipitaka-md");

	if (fs.existsSync(outputDir)) {
		await fsPromises.rm(outputDir, { recursive: true, force: true });
	}
	await fsPromises.mkdir(outputDir, { recursive: true });

	const xmlFiles = (await fsPromises.readdir(inputDir, { withFileTypes: true }))
		.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".xml"))
		.map((e) => e.name);

	for (const name of xmlFiles) {
		const filePath = path.join(inputDir, name);
		await convertXmlFileToMarkdown(filePath, outputDir);
	}
}
