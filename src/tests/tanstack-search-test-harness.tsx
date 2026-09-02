import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import * as v from "valibot";
import { DEFAULT_VIEW, VIEW_VALUES, type View } from "@/app/_constants/view";

export interface TestSearchState {
	view: View;
	annotations: string[];
}

type SearchUpdate = (previous: TestSearchState) => TestSearchState;

interface TestSearchContextValue {
	search: TestSearchState;
	navigate: (options: { search: SearchUpdate; replace?: boolean }) => void;
}

const TestSearchContext = createContext<TestSearchContextValue | null>(null);

function parseSearchParams(initialSearchParams: string): TestSearchState {
	const params = new URLSearchParams(initialSearchParams);
	const viewResult = v.safeParse(v.picklist(VIEW_VALUES), params.get("view"));
	const annotations = params
		.getAll("annotations")
		.flatMap((value) =>
			value.startsWith("[")
				? parseJsonAnnotations(value)
				: value.split("~").filter(Boolean),
		);

	return {
		view: viewResult.success ? viewResult.output : DEFAULT_VIEW,
		annotations,
	};
}

function parseJsonAnnotations(value: string): string[] {
	try {
		const result = v.safeParse(v.array(v.string()), JSON.parse(value));
		return result.success ? result.output : [];
	} catch {
		return [];
	}
}

export function TanStackSearchTestProvider({
	children,
	initialSearchParams = "",
}: {
	children: ReactNode;
	initialSearchParams?: string;
}) {
	const [search, setSearch] = useState(() =>
		parseSearchParams(initialSearchParams),
	);
	const navigate = ({ search: update }: { search: SearchUpdate }) => {
		setSearch(update);
	};

	return (
		<TestSearchContext.Provider value={{ navigate, search }}>
			{children}
		</TestSearchContext.Provider>
	);
}

function useTestSearchContext() {
	const context = useContext(TestSearchContext);
	if (!context) {
		throw new Error("TanStackSearchTestProvider is required");
	}
	return context;
}

export const testPageDetailRoute = {
	useSearch<T>({ select }: { select: (search: TestSearchState) => T }) {
		const { search } = useTestSearchContext();
		return select(search);
	},
	useNavigate() {
		return useTestSearchContext().navigate;
	},
};
