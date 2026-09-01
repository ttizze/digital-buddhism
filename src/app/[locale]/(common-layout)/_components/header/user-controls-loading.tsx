import { Skeleton } from "@/components/ui/skeleton";

export function HeaderUserControlsLoading() {
	return (
		<div className="flex items-center gap-4">
			<Skeleton className="h-11 w-[150px] rounded-full" />
			<Skeleton className="h-10 w-[120px] rounded-full" />
		</div>
	);
}
