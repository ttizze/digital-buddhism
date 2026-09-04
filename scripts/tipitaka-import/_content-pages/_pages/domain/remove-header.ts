export function removeHeader(markdown: string) {
	const lines = markdown.split(/\r?\n/);
	const headerIndex = lines.findIndex((line) => /^#\s+\S/.test(line.trim()));
	if (headerIndex < 0) {
		throw new Error("Tipitaka Markdown has no page header");
	}
	const header = lines[headerIndex]?.trim().replace(/^#\s+/, "") ?? "";
	lines.splice(headerIndex, 1);

	return { header, body: lines.join("\n").trim() };
}
