import type { ReactNode } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeParse from "rehype-parse";
import rehypeReact from "rehype-react";
import rehypeSanitize from "rehype-sanitize";
import { unified } from "unified";
import { normalizeInlineHtml } from "./normalize-inline-html";

const processor = unified()
	.use(rehypeParse, { fragment: true })
	.use(rehypeSanitize)
	.use(rehypeReact, jsxRuntime);

export function sanitizeAndParseText(text: string): ReactNode {
	const normalized = normalizeInlineHtml(text);
	return processor.processSync(normalized).result as ReactNode;
}
