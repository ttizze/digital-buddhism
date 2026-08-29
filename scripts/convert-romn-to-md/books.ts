import * as fs from "node:fs";
import * as path from "node:path";

interface BookData {
	level: "Mula" | "Atthakatha" | "Tika" | "Other";
	dirSegments: string[];
	mulaFileName: string | null;
	mulaFileNames: string[];
	chapterListTypes?: string[];
}

interface BooksJsonPayload {
	generatedAt: string;
	count: number;
	data: Record<string, BookData>;
}

const BOOKS_JSON_PATH = path.resolve(
	process.cwd(),
	"scripts",
	"convert-romn-to-md",
	"data",
	"books.json",
);

const booksData = loadBooksJson();

function loadBooksJson(): Record<string, BookData> {
	if (!fs.existsSync(BOOKS_JSON_PATH)) {
		throw new Error(
			`books.json が存在しません。gen-books-data.mjs を実行してから再度お試しください: ${BOOKS_JSON_PATH}`,
		);
	}
	const raw = fs.readFileSync(BOOKS_JSON_PATH, "utf8");
	const payload = JSON.parse(raw) as BooksJsonPayload;
	if (!payload?.data) {
		throw new Error("books.json の形式が不正です。");
	}
	return payload.data;
}

export function getFileData(fileName: string): {
	level: BookData["level"];
	dirSegments: string[];
	chapterListTypes?: string[];
} {
	const book = booksData[fileName.toLowerCase()];
	if (!book) {
		throw new Error(
			`books.json に分類情報がありません: ${fileName.toLowerCase()}`,
		);
	}
	return {
		level: book.level,
		dirSegments: Array.isArray(book.dirSegments) ? [...book.dirSegments] : [],
		chapterListTypes: book.chapterListTypes,
	};
}
