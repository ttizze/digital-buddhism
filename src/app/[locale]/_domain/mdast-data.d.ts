import type { SegmentDraft } from "./remark-hash-and-segments";

interface MdastProperties {
	class?: string;
	className?: string;
	"data-number-id"?: string;
}

declare module "mdast" {
	interface Data {
		hProperties?: MdastProperties;
	}
}

declare module "vfile" {
	interface DataMap {
		segments: SegmentDraft[];
	}
}

export {};
