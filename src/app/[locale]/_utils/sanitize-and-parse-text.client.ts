"use client";
import DOMPurify from "dompurify";
import parse from "html-react-parser";
import { normalizeInlineHtml } from "./normalize-inline-html";

export function sanitizeAndParseText(text: string): React.ReactNode {
	return parse(sanitizeTextToHtml(text));
}

export function sanitizeTextToHtml(text: string): string {
	return DOMPurify.sanitize(normalizeInlineHtml(text));
}
