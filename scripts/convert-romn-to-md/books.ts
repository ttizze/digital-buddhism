import * as fs from "node:fs";
import * as path from "node:path";
import * as v from "valibot";

const bookDataSchema = v.object({
	level: v.picklist(["Mula", "Atthakatha", "Tika", "Other"]),
	dirSegments: v.array(v.string()),
});
const booksJsonPayloadSchema = v.object({
	generatedAt: v.string(),
	count: v.number(),
	data: v.record(v.string(), bookDataSchema),
});

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
			`books.json が存在しません。gen-books-data.ts を実行してから再度お試しください: ${BOOKS_JSON_PATH}`,
		);
	}
	const raw = fs.readFileSync(BOOKS_JSON_PATH, "utf8");
	const payload = v.parse(booksJsonPayloadSchema, JSON.parse(raw));
	return payload.data;
}

type BookData = v.InferOutput<typeof bookDataSchema>;

export function getFileData(fileName: string) {
	const book = booksData[fileName.toLowerCase()];
	if (!book) {
		throw new Error(
			`books.json に分類情報がありません: ${fileName.toLowerCase()}`,
		);
	}
	return book;
}
