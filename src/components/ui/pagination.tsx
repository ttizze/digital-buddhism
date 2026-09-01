import {
	ChevronLeftIcon,
	ChevronRightIcon,
	DotsHorizontalIcon,
} from "@radix-ui/react-icons";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import type { ButtonProps } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
	<nav
		aria-label="pagination"
		className={cn("mx-auto flex w-full justify-center", className)}
		{...props}
	/>
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
	HTMLUListElement,
	React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
	<ul
		className={cn("flex flex-row items-center gap-1", className)}
		ref={ref}
		{...props}
	/>
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
	HTMLLIElement,
	React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
	<li className={cn("", className)} ref={ref} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
	asChild?: boolean;
	isActive?: boolean;
} & Pick<ButtonProps, "size"> &
	React.ComponentProps<"a">;

const PaginationLink = ({
	asChild,
	className,
	isActive,
	size = "icon",
	...props
}: PaginationLinkProps) => {
	const Comp = asChild ? Slot : "a";
	return (
		<Comp
			aria-current={isActive ? "page" : undefined}
			className={cn(
				buttonVariants({
					variant: isActive ? "outline" : "ghost",
					size,
				}),
				className,
			)}
			{...props}
		/>
	);
};
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
	children,
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) => (
	<PaginationLink
		aria-label="Go to previous page"
		className={cn("gap-1 pl-2.5", className)}
		size="default"
		{...props}
	>
		{children ?? (
			<>
				<ChevronLeftIcon className="h-4 w-4" />
				<span>Previous</span>
			</>
		)}
	</PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
	children,
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) => (
	<PaginationLink
		aria-label="Go to next page"
		className={cn("gap-1 pr-2.5", className)}
		size="default"
		{...props}
	>
		{children ?? (
			<>
				<span>Next</span>
				<ChevronRightIcon className="h-4 w-4" />
			</>
		)}
	</PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({
	className,
	...props
}: React.ComponentProps<"span">) => (
	<span
		aria-hidden
		className={cn("flex h-9 w-9 items-center justify-center", className)}
		{...props}
	>
		<DotsHorizontalIcon className="h-4 w-4" />
		<span className="sr-only">More pages</span>
	</span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
