import type { SearchResultsData } from "./_db/queries";
import type { Category } from "./constants";
import { SearchPageClient } from "./search";
import { SearchResults } from "./search-results";

export function SearchPagePresentation({
	category,
	data,
	locale,
	page,
	query,
}: {
	category: Category;
	data: SearchResultsData;
	locale: string;
	page: number;
	query: string;
}) {
	return (
		<section>
			<div className="max-w-(--breakpoint-xl) mx-auto py-6">
				<SearchPageClient
					category={category}
					key={query}
					locale={locale}
					query={query}
				/>
				{query && (
					<div className="">
						<SearchResults
							currentCategory={category}
							currentPage={page}
							locale={locale}
							pageSummaries={data.pageSummaries}
							totalPages={data.totalPages}
							users={data.users}
						/>
					</div>
				)}
			</div>
		</section>
	);
}
