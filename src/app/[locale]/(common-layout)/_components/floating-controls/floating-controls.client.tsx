"use client";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { Suspense, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useScrollVisibility } from "./hooks/use-scroll-visibility";
import { ShareDialog } from "./share-dialog";
import { ViewCycle } from "./view-cycle.client";

interface AnnotationType {
	key: string;
	label: string;
}

interface FloatingControlsProps {
	position?: string;
	alwaysVisible?: boolean;
	annotationTypes?: AnnotationType[]; // List of annotation types
	userLocale: string;
	sourceLocale: string;
}
export function FloatingControls({
	position = `fixed bottom-4 left-1/2 -translate-x-1/2 duration-300 `,
	alwaysVisible = false,
	annotationTypes = [],
	userLocale,
	sourceLocale,
}: FloatingControlsProps) {
	const { isVisible, ignoreNextScroll } = useScrollVisibility(alwaysVisible);
	const [visibleAnnotations, setVisibleAnnotations] = useQueryState(
		"annotations",
		parseAsArrayOf(parseAsString, "~")
			.withDefault([])
			.withOptions({ shallow: true }),
	);
	const visibleAnnotationSet = useMemo(
		() => new Set(visibleAnnotations),
		[visibleAnnotations],
	);
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
		const isVisible = visibleAnnotationSet.has(uniqueKey);
		if (isVisible) {
			setVisibleAnnotations(visibleAnnotations.filter((k) => k !== uniqueKey));
		} else {
			setVisibleAnnotations([...visibleAnnotations, uniqueKey]);
		}
		ignoreNextScroll();
	};

	/* --- Buttons --- */
	const Buttons = (
		<div className="flex gap-6 justify-center">
			<div className="flex flex-col items-center gap-1 group">
				<Suspense fallback={null}>
					<ViewCycle
						afterClick={ignoreNextScroll}
						sourceLocale={sourceLocale}
						userLocale={userLocale}
					/>
				</Suspense>
				<span className="text-[10px] leading-none text-muted-foreground transition-colors group-hover:text-foreground">
					View
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
						title={`${isActive ? "Hide" : "Show"} ${annotationType.label}`}
						variant={isActive ? "default" : "outline"}
					>
						{annotationType.label}
					</Button>
				);
			})}

			<div className="flex flex-col items-center gap-1 group">
				<ShareDialog />
				<span className="text-[10px] leading-none text-muted-foreground transition-colors group-hover:text-foreground">
					Share
				</span>
			</div>
		</div>
	);

	return (
		<div
			className={cn(
				`${position} z-50 w-auto border rounded-full py-3 px-9 backdrop-blur-sm `,
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			{Buttons}
		</div>
	);
}
