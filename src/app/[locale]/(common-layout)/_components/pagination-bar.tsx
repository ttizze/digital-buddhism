import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationBarProps {
	totalPages: number;
	currentPage: number;
}

export function PaginationBar({ totalPages, currentPage }: PaginationBarProps) {
	const t = useTranslations("Search");
	if (totalPages <= 1) {
		return null;
	}

	return (
		<Pagination aria-label={t("pagination")} className="mt-4">
			<PaginationContent className="w-full justify-between">
				<PaginationItem>
					{currentPage === 1 ? (
						<PaginationPrevious
							aria-label={t("previous")}
							aria-disabled="true"
							className="pointer-events-none opacity-50"
						>
							<ChevronLeftIcon className="h-4 w-4" />
							<span>{t("previous")}</span>
						</PaginationPrevious>
					) : (
						<PaginationPrevious aria-label={t("previous")} asChild>
							<Link
								search={(previous) => ({
									...previous,
									page: currentPage - 1,
								})}
								to="."
							>
								<ChevronLeftIcon className="h-4 w-4" />
								<span>{t("previous")}</span>
							</Link>
						</PaginationPrevious>
					)}
				</PaginationItem>
				<PaginationItem className="flex items-center space-x-2">
					{Array.from({ length: totalPages }, (_, i) => i + 1).map(
						(pageNumber) => {
							if (
								pageNumber === 1 ||
								pageNumber === totalPages ||
								(pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
							) {
								return (
									<PaginationLink
										asChild
										isActive={currentPage === pageNumber}
										key={`page-${pageNumber}`}
									>
										<Link
											search={(previous) => ({
												...previous,
												page: pageNumber,
											})}
											to="."
										>
											{pageNumber}
										</Link>
									</PaginationLink>
								);
							}
							if (
								pageNumber === currentPage - 2 ||
								pageNumber === currentPage + 2
							) {
								return <PaginationEllipsis key={`ellipsis-${pageNumber}`} />;
							}
							return null;
						},
					)}
				</PaginationItem>
				<PaginationItem>
					{currentPage === totalPages ? (
						<PaginationNext
							aria-label={t("next")}
							aria-disabled="true"
							className="pointer-events-none opacity-50"
						>
							<span>{t("next")}</span>
							<ChevronRightIcon className="h-4 w-4" />
						</PaginationNext>
					) : (
						<PaginationNext aria-label={t("next")} asChild>
							<Link
								search={(previous) => ({
									...previous,
									page: currentPage + 1,
								})}
								to="."
							>
								<span>{t("next")}</span>
								<ChevronRightIcon className="h-4 w-4" />
							</Link>
						</PaginationNext>
					)}
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
