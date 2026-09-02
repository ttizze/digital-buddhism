import type { Root } from "mdast";
import { toMarkdown } from "mdast-util-to-markdown";

export function mdastToMarkdown(root: Root): string {
	return toMarkdown(root);
}
