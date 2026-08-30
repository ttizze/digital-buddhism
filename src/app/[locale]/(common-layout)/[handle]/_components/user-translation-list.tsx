import { Link } from "@tanstack/react-router";
import { PaginationBar } from "@/app/[locale]/(common-layout)/_components/pagination-bar";
import type { UserTranslationContribution } from "../_db/queries";

export function UserTranslationList({
	isOwner,
	locale,
	page,
	contributions,
	totalPages,
}: {
	isOwner: boolean;
	locale: string;
	page: number;
	contributions: UserTranslationContribution[];
	totalPages: number;
}) {
	if (contributions.length === 0) {
		return (
			<p className="text-center text-gray-500 mt-10">
				{isOwner
					? "You haven't submitted any translations yet."
					: "No translations yet."}
			</p>
		);
	}

	return (
		<>
			<div className="divide-y">
				{contributions.map((contribution) => (
					<article className="py-4" key={contribution.id}>
						<Link
							className="font-medium hover:underline"
							params={{ locale, pageSlug: contribution.pageSlug }}
							to="/$locale/tipitaka/$pageSlug"
						>
							{contribution.sourceText}
						</Link>
						<p className="mt-1">{contribution.text}</p>
						<div className="mt-1 flex gap-2 text-xs text-muted-foreground">
							<span>{contribution.locale}</span>
							<span>{contribution.point} points</span>
							<time>{contribution.createdAt.toLocaleDateString(locale)}</time>
						</div>
					</article>
				))}
			</div>
			{totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<PaginationBar currentPage={page} totalPages={totalPages} />
				</div>
			)}
		</>
	);
}
