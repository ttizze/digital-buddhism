import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
	}: {
		children: ReactNode;
		className: string;
	}) => (
		<a className={className} href="/ja/tipitaka/tipitaka">
			{children}
		</a>
	),
}));

import { TipitakaPageList } from "./tipitaka-page-list";
import type { TipitakaPageTreeNode } from "./domain/extract-tipitaka-page-tree";

function pageNode(
	id: number,
	slug: string,
	titleText: string,
	children: TipitakaPageTreeNode[],
): TipitakaPageTreeNode {
	return {
		id,
		slug,
		parentId: id - 1,
		position: 0,
		titleSegmentId: id * 10,
		titleText,
		titleTranslationText: null,
		children,
	};
}

describe("Tipiṭaka一覧", () => {
	it("一覧内のsegmentだけ800pxの仮高さを無効にする", () => {
		render(
			<TipitakaPageList
				locale="ja"
				pages={[
					{
						id: 1,
						slug: "tipitaka",
						parentId: 0,
						position: 0,
						titleSegmentId: 10,
						titleText: "Tipitaka Mula",
						titleTranslationText: null,
						children: [],
					},
				]}
			/>,
		);

		expect(screen.getByRole("navigation", { name: "Tipiṭaka" })).toHaveClass(
			"tipitaka-tree",
		);
	});

	it("初期表示ではDigha Nikaya階層まで開き、経典一覧は閉じる", () => {
		const text = pageNode(4, "text", "Silakkhandhavaggapali", []);
		const collection = pageNode(
			3,
			"tipitaka-01-tipitaka-mula-01-sutta-pitaka-01-digha-nikaya",
			"Digha Nikaya",
			[text],
		);
		const basket = pageNode(2, "basket", "Sutta Pitaka", [collection]);
		const vinayaText = pageNode(6, "vinaya-text", "Parajikapali", []);
		const vinaya = pageNode(5, "vinaya", "Vinaya Pitaka", [vinayaText]);
		const edition = pageNode(1, "edition", "Tipitaka Mula", [basket, vinaya]);
		const { container } = render(
			<TipitakaPageList locale="ja" pages={[edition]} />,
		);

		const details = [...container.querySelectorAll("details")];
		expect(details.map((element) => element.open)).toEqual([
			true,
			true,
			false,
			false,
		]);
		expect(container.querySelectorAll("a")).toHaveLength(4);
		expect(screen.queryByText("Silakkhandhavaggapali")).toBeNull();
		expect(screen.queryByText("Parajikapali")).toBeNull();

		const collectionDetails = details[2];
		if (!collectionDetails) throw new Error("Digha Nikaya階層がありません");
		collectionDetails.open = true;
		fireEvent(collectionDetails, new Event("toggle"));

		expect(container.querySelectorAll("a")).toHaveLength(5);
		expect(screen.getByText("Silakkhandhavaggapali")).toBeInTheDocument();
		expect(screen.queryByText("Parajikapali")).toBeNull();
	});
});
