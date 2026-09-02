/**
 * カスタムブロック記法のタイプ定義
 *
 * これらのタイプは `::type\n...\n::` 形式で使用され、
 * `<p class="type">` に変換されます。
 */

export const GATHA_BLOCK_TYPES = [
	"gatha1",
	"gatha2",
	"gatha3",
	"gathalast",
] as const;

export const BLOCK_TYPES = ["indent", "unindented", "centre"] as const;

const HANGNUM_BLOCK_TYPE = "hangnum" as const;

export type CustomBlockType =
	| (typeof GATHA_BLOCK_TYPES)[number]
	| (typeof BLOCK_TYPES)[number]
	| typeof HANGNUM_BLOCK_TYPE;

/**
 * ブロックタイプが有効かどうかをチェック
 */
export function isValidBlockType(
	blockType: string,
): blockType is CustomBlockType {
	switch (blockType) {
		case "gatha1":
		case "gatha2":
		case "gatha3":
		case "gathalast":
		case "indent":
		case "unindented":
		case "centre":
		case "hangnum":
			return true;
		default:
			return false;
	}
}
