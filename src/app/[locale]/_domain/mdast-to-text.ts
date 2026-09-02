import type { Root } from "mdast";
import { toString } from "mdast-util-to-string";

/**
 * MDASTを表示用のプレーンテキストに変換する。
 */
export function mdastToText(root: Root): string {
	return toString(root);
}
