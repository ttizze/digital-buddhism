import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
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
	if (totalPages <= 1) {
		return null;
	}

	return (
		<Pagination className="mt-4">
			<PaginationContent className="w-full justify-between">
				<PaginationItem>
					{currentPage === 1 ? (
						<PaginationPrevious
							aria-disabled="true"
							className="pointer-events-none opacity-50"
						/>
					) : (
						<PaginationPrevious asChild>
							<Link
								search={(previous) => ({
									...previous,
									page: currentPage - 1,
								})}
								to="."
							>
								<ChevronLeftIcon className="h-4 w-4" />
								<span>Previous</span>
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
							aria-disabled="true"
							className="pointer-events-none opacity-50"
						/>
					) : (
						<PaginationNext asChild>
							<Link
								search={(previous) => ({
									...previous,
									page: currentPage + 1,
								})}
								to="."
							>
								<span>Next</span>
								<ChevronRightIcon className="h-4 w-4" />
							</Link>
						</PaginationNext>
					)}
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
