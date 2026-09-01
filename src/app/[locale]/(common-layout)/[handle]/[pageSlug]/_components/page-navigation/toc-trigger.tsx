"use client";
import { List } from "lucide-react";
import { useTranslations } from "use-intl";
import type { TocItem } from "../../_domain/extract-toc-items";
import { IconPopoverTrigger } from "./icon-popover-trigger";
import Toc from "./toc";

export function TocTrigger({ items }: { items: TocItem[] }) {
	const t = useTranslations("PageNavigation");
	if (items.length === 0) return null;

	return (
		<IconPopoverTrigger
			align="end"
			icon={<List className="size-5" />}
			title={t("tocTitle")}
		>
			<Toc items={items} />
		</IconPopoverTrigger>
	);
}
