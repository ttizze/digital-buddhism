"use client";
import { useEffect } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pageDetailRoute } from "../page-detail-route-api";
import { useScrollVisibility } from "./hooks/use-scroll-visibility";
import { ShareDialog } from "./share-dialog";
import { ViewCycle } from "./view-cycle.client";

interface AnnotationType {
	key: string;
	label: string;
}

interface FloatingControlsProps {
	annotationTypes?: AnnotationType[]; // List of annotation types
	userLocale: string;
	sourceLocale: string;
}
export function FloatingControls({
	annotationTypes = [],
	userLocale,
	sourceLocale,
}: FloatingControlsProps) {
	const t = useTranslations("FloatingControls");
	const { isVisible, ignoreNextScroll } = useScrollVisibility();
	const visibleAnnotations = pageDetailRoute.useSearch({
		select: (search) => search.annotations,
	});
	const navigate = pageDetailRoute.useNavigate();
	const visibleAnnotationSet = new Set(visibleAnnotations);
	useEffect(() => {
		const tokens = visibleAnnotations.filter(Boolean);
		if (tokens.length === 0) {
			delete document.documentElement.dataset.annotations;
			return;
		}
		document.documentElement.dataset.annotations = tokens.join(" ");
	}, [visibleAnnotations]);

	const toggleAnnotationType = (annotationType: AnnotationType) => {
		const uniqueKey = annotationType.label;
		void navigate({
			search: (previous) => {
				const isVisible = previous.annotations.includes(uniqueKey);
				return {
					...previous,
					annotations: isVisible
						? previous.annotations.filter((key) => key !== uniqueKey)
						: [...previous.annotations, uniqueKey],
				};
			},
			replace: true,
		});
		ignoreNextScroll();
	};

	return (
		<div
			className={cn(
				"fixed bottom-4 left-1/2 -translate-x-1/2 duration-300 z-50 w-auto border rounded-full py-3 px-9 backdrop-blur-sm",
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			<div className="flex gap-6 justify-center">
				<div className="flex flex-col items-center gap-1 group">
					<ViewCycle
						afterClick={ignoreNextScroll}
						sourceLocale={sourceLocale}
						userLocale={userLocale}
					/>
					<span className="text-[10px] leading-none text-muted-foreground transition-colors group-hover:text-foreground">
						{t("view")}
					</span>
				</div>

				{annotationTypes.map((annotationType) => {
					const uniqueKey = annotationType.label;
					const isActive = visibleAnnotationSet.has(uniqueKey);
					return (
						<Button
							className="h-10 px-3 rounded-full text-sm cursor-pointer"
							key={uniqueKey}
							onClick={() => toggleAnnotationType(annotationType)}
							title={
								isActive
									? t("hideAnnotation", { label: annotationType.label })
									: t("showAnnotation", { label: annotationType.label })
							}
							variant={isActive ? "default" : "outline"}
						>
							{annotationType.label}
						</Button>
					);
				})}

				<div className="flex flex-col items-center gap-1 group">
					<ShareDialog />
					<span className="text-[10px] leading-none text-muted-foreground transition-colors group-hover:text-foreground">
						{t("share")}
					</span>
				</div>
			</div>
		</div>
	);
}
