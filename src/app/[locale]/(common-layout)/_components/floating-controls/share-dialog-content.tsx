import { CopyIcon } from "lucide-react";
import type { RefObject } from "react";
import {
	FacebookIcon,
	FacebookShareButton,
	RedditIcon,
	RedditShareButton,
	TwitterShareButton,
} from "react-share";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { pageDetailRoute } from "../page-detail-route-api";

export function ShareDialogContent({
	onOpenChange,
	triggerRef,
}: {
	onOpenChange: (open: boolean) => void;
	triggerRef: RefObject<HTMLButtonElement | null>;
}) {
	const t = useTranslations("FloatingControls");
	const view = pageDetailRoute.useSearch({ select: (search) => search.view });

	/* いま表示中のモードを取得 */
	const shareTitle = typeof window !== "undefined" ? document.title : "";

	/* 共有 URL を組み立て */
	const getShareUrl = () => {
		if (typeof window === "undefined") return "";
		const url = new URL(window.location.href);
		url.searchParams.set("view", view);
		return url.toString();
	};

	return (
		<Dialog onOpenChange={onOpenChange} open>
			<DialogContent
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					triggerRef.current?.focus();
				}}
				className="sm:max-w-md rounded-3xl p-6"
			>
				<DialogHeader>
					<DialogTitle className="text-center">{t("share")}</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-6 mt-4">
					<div className="flex justify-center space-x-4">
						{/* コピー */}
						<Button
							className="rounded-full"
							onClick={() => {
								void navigator.clipboard.writeText(getShareUrl());
								toast.success(t("copied"));
							}}
							size="icon"
							variant="outline"
						>
							<CopyIcon className="w-4 h-4" />
						</Button>

						{/* SNS */}
						<FacebookShareButton url={getShareUrl()}>
							<FacebookIcon round size={32} />
						</FacebookShareButton>

						<TwitterShareButton title={shareTitle} url={getShareUrl()}>
							<img
								alt="X"
								className="dark:invert"
								height={32}
								src="/x.svg"
								width={32}
							/>
						</TwitterShareButton>

						<RedditShareButton title={shareTitle} url={getShareUrl()}>
							<RedditIcon round size={32} />
						</RedditShareButton>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
