import { Share } from "lucide-react";
import { lazy, Suspense, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";

const ShareDialogContent = lazy(() =>
	import("./share-dialog-content").then((module) => ({
		default: module.ShareDialogContent,
	})),
);

export function ShareDialog() {
	const t = useTranslations("FloatingControls");
	const [isOpen, setIsOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	return (
		<>
			<Button
				ref={triggerRef}
				aria-label={t("share")}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				className="h-10 w-10 rounded-full bg-background cursor-pointer"
				onClick={() => setIsOpen(true)}
				size="icon"
				variant="ghost"
			>
				<Share className="h-5 w-5" />
			</Button>
			{isOpen && (
				<Suspense fallback={null}>
					<ShareDialogContent
						onOpenChange={setIsOpen}
						triggerRef={triggerRef}
					/>
				</Suspense>
			)}
		</>
	);
}
