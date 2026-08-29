import type { ReactNode } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeParse from "rehype-parse";
import rehypeReact from "rehype-react";
import rehypeSanitize from "rehype-sanitize";
import { unified } from "unified";

function normalizeInlineHtml(text: string): string {
	// Avoid invalid nested block tags when this content is rendered inside
	// <p>/<h*> etc via `WrapSegment`/`SegmentElement` (prevents hydration mismatch).
	const withBreaks = text.replace(/(\r\n|\n|\\n)/g, "<br />");
	const unwrappedBlockTags = withBreaks.replace(
		/<\/?(?:p|h[1-6]|li|td|th|blockquote)\b[^>]*>/gi,
		(tag) => (tag.startsWith("</") ? "<br />" : ""),
	);
	// Collapse duplicate line breaks introduced by stripping wrappers.
	return unwrappedBlockTags.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br /><br />");
}

const processor = unified()
	.use(rehypeParse, { fragment: true })
	.use(rehypeSanitize)
	.use(rehypeReact, jsxRuntime);

export function sanitizeAndParseText(text: string): ReactNode {
	const normalized = normalizeInlineHtml(text);
	return processor.processSync(normalized).result as ReactNode;
}
