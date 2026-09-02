import { Fragment, type ReactNode } from "react";
import enMessages from "../../messages/en.json";

type Tree = { [key: string]: string | Tree };
type RichValues = Record<string, unknown>;

function lookup(path: string): string {
	let node: string | Tree | undefined = enMessages as Tree;
	for (const part of path.split(".")) {
		if (typeof node !== "object" || node === undefined) return path;
		node = node[part];
	}
	return typeof node === "string" ? node : path;
}

function interpolate(message: string, values?: RichValues): string {
	let result = message;
	for (const [name, value] of Object.entries(values ?? {})) {
		if (typeof value === "function") continue;
		result = result.replaceAll(`{${name}}`, String(value));
	}
	return result;
}

function renderRich(message: string, values?: RichValues): ReactNode {
	const parts: ReactNode[] = [];
	const tagRegex = /<(\w+)>(.*?)<\/\1>/g;
	let lastIndex = 0;
	let match = tagRegex.exec(message);
	while (match !== null) {
		if (match.index > lastIndex) {
			parts.push(message.slice(lastIndex, match.index));
		}
		const handler = values?.[match[1]];
		parts.push(
			typeof handler === "function"
				? (handler as (children: ReactNode) => ReactNode)(match[2])
				: match[2],
		);
		lastIndex = match.index + match[0].length;
		match = tagRegex.exec(message);
	}
	if (lastIndex < message.length) parts.push(message.slice(lastIndex));
	return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
}

/**
 * use-intl をモックするテスト用の翻訳関数。
 * 実際の messages/en.json から文言を引くので、英語文言でのアサーションがそのまま使える。
 */
export function createEnTranslator(namespace?: string) {
	const resolvePath = (key: string) =>
		lookup(namespace ? `${namespace}.${key}` : key);
	const t = (key: string, values?: RichValues) =>
		interpolate(resolvePath(key), values);
	t.rich = (key: string, values?: RichValues) =>
		renderRich(interpolate(resolvePath(key), values), values);
	t.markup = t;
	t.raw = resolvePath;
	t.has = () => true;
	return t;
}
