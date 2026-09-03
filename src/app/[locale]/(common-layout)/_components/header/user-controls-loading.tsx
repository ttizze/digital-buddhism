import { Skeleton } from "@/components/ui/skeleton";

export function HeaderUserControlsLoading() {
	return (
		<div className="flex items-center gap-1.5 sm:gap-4">
			<Skeleton className="h-11 w-[110px] rounded-full sm:w-[150px]" />
			<Skeleton className="h-10 w-20 rounded-full sm:w-[120px]" />
		</div>
	);
}
