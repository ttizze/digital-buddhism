import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { getPageMarkdownData } from "@/routes/$locale/-page-detail-data";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExportMarkdownButtonProps {
	locale: string;
	title: string;
	slug: string;
}

function toSafeFileName(value: string) {
	const trimmed = value.trim();
	const safe = trimmed
		.replace(/[\\/:*?"<>|]/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
	return safe.length > 0 ? safe : "page";
}

export function ExportMarkdownButton({
	locale,
	title,
	slug,
}: ExportMarkdownButtonProps) {
	const t = useTranslations("PageNavigation");
	const [isExporting, setIsExporting] = useState(false);
	const baseName = toSafeFileName(title || slug);
	const fileName = `${baseName}.md`;
	const label = t("exportMarkdown");

	const handleClick = async () => {
		setIsExporting(true);
		try {
			const markdown = await getPageMarkdownData({
				data: { locale, pageSlug: slug },
			});
			if (!markdown?.trim()) {
				toast.error(t("exportMarkdownError"));
				return;
			}
			downloadMarkdown(markdown, fileName);
		} catch {
			toast.error(t("exportMarkdownError"));
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label={label}
						aria-busy={isExporting}
						disabled={isExporting}
						onClick={handleClick}
						variant="ghost"
					>
						<DownloadIcon className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function downloadMarkdown(markdown: string, fileName: string): void {
	const blob = new Blob([markdown], {
		type: "text/markdown;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
