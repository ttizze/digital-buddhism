import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { DEFAULT_VIEW, VIEW_VALUES, type View } from "@/app/_constants/view";

export interface TestSearchState {
	view: View;
	annotations: string[];
}

type SearchUpdate =
	| Partial<TestSearchState>
	| ((previous: TestSearchState) => TestSearchState);

interface TestSearchContextValue {
	search: TestSearchState;
	navigate: (options: { search: SearchUpdate; replace?: boolean }) => void;
}

const TestSearchContext = createContext<TestSearchContextValue | null>(null);

function parseSearchParams(initialSearchParams: string): TestSearchState {
	const params = new URLSearchParams(initialSearchParams);
	const rawView = params.get("view");
	const annotations = params
		.getAll("annotations")
		.flatMap((value) =>
			value.startsWith("[")
				? parseJsonAnnotations(value)
				: value.split("~").filter(Boolean),
		);

	return {
		view: VIEW_VALUES.includes(rawView as View)
			? (rawView as View)
			: DEFAULT_VIEW,
		annotations,
	};
}

function parseJsonAnnotations(value: string): string[] {
	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) &&
			parsed.every((item) => typeof item === "string")
			? parsed
			: [];
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
		setSearch((previous) =>
			typeof update === "function"
				? update(previous)
				: { ...previous, ...update },
		);
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
	useSearch<T>(options?: { select?: (search: TestSearchState) => T }) {
		const { search } = useTestSearchContext();
		return options?.select ? options.select(search) : (search as T);
	},
	useNavigate() {
		return useTestSearchContext().navigate;
	},
};
