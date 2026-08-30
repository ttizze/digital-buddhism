import { Skeleton } from "@/components/ui/skeleton";

export function HeaderUserControlsLoading() {
	return (
		<div className="flex items-center gap-3">
			<Skeleton className="h-6 w-[150px] rounded-full" />
			<Skeleton className="h-6 w-20 rounded-full" />
		</div>
	);
}
