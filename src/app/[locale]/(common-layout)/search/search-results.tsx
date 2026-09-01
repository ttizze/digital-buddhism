import { PageList } from "@/app/[locale]/(common-layout)/_components/page/page-list";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import type { PageForList } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/db/types.helpers";
import type { Category } from "./constants";

interface SearchResultsProps {
	pageSummaries: PageForList[] | undefined;
	users: SanitizedUser[] | undefined;
	totalPages: number;
	currentCategory: Category;
	currentPage: number;
	locale: string;
}

export function SearchResults({
	pageSummaries,
	users,
	totalPages,
	currentCategory,
	currentPage,
	locale,
}: SearchResultsProps) {
	const noResults =
		currentCategory === "user" ? !users?.length : !pageSummaries?.length;

	return (
		<div>
			<div className="space-y-4">
				{noResults && <p className="text-gray-500">No results found.</p>}

				{currentCategory === "user" &&
					users !== undefined &&
					users.length > 0 && (
						<div className="space-y-4">
							{users.map((usr) => (
								<div
									className="flex items-start p-4 rounded-lg"
									key={usr.handle}
								>
									<div className="flex-1">
										<a href={`/${locale}/${usr.handle}`}>
											<h3 className="text-xl font-bold">{usr.name}</h3>
											<span className="text-gray-500 text-sm">
												@{usr.handle}
											</span>
										</a>
									</div>
								</div>
							))}
						</div>
					)}

				{(currentCategory === "title" || currentCategory === "content") &&
					pageSummaries !== undefined &&
					pageSummaries.length > 0 && (
						<div className="space-y-4">
							{pageSummaries.map((p) => (
								<PageList key={p.id} locale={locale} page={p} />
							))}
						</div>
					)}
			</div>
			{totalPages > 1 && (
				<div className="mt-4 flex items-center gap-4">
					<PaginationBar currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}
		</div>
	);
}
