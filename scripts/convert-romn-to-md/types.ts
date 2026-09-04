import type { Element } from "@xmldom/xmldom";

export interface BookDoc {
	nodes: Element[];
	dirSegments: string[];
}

export interface SiteTocEntry {
	title: string;
	outputFileName: string;
}
