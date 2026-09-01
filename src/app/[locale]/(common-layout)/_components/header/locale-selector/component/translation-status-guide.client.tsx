"use client";

import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "use-intl";
import type { TranslationProofStatus } from "@/drizzle/types";
import { cn } from "@/lib/utils";
import { TranslationProofStatusIcon } from "./translation-proof-status-icon";

const STATUS_ROWS: Array<{
	localeStatus: "source" | "translated" | "untranslated";
	proofStatus: TranslationProofStatus | undefined;
	titleKey: string;
	descriptionKey: string;
}> = [
	{
		localeStatus: "source",
		proofStatus: undefined,
		titleKey: "sourceTitle",
		descriptionKey: "sourceDescription",
	},
	{
		localeStatus: "translated",
		proofStatus: "MACHINE_DRAFT",
		titleKey: "machineDraftTitle",
		descriptionKey: "machineDraftDescription",
	},
	{
		localeStatus: "translated",
		proofStatus: "HUMAN_TOUCHED",
		titleKey: "humanTouchedTitle",
		descriptionKey: "humanTouchedDescription",
	},
	{
		localeStatus: "translated",
		proofStatus: "PROOFREAD",
		titleKey: "proofreadTitle",
		descriptionKey: "proofreadDescription",
	},
	{
		localeStatus: "translated",
		proofStatus: "VALIDATED",
		titleKey: "validatedTitle",
		descriptionKey: "validatedDescription",
	},
	{
		localeStatus: "untranslated",
		proofStatus: undefined,
		titleKey: "untranslatedTitle",
		descriptionKey: "untranslatedDescription",
	},
];

export function TextStatusGuide() {
	const [showHelpSection, setShowHelpSection] = useState(false);
	const t = useTranslations("Header.TextStatusGuide");

	return (
		<div className="px-3 py-2">
			<button
				className="flex w-full justify-between text-sm cursor-pointer text-muted-foreground items-center"
				onClick={() => setShowHelpSection(!showHelpSection)}
				type="button"
			>
				<div className="flex items-center ">
					<Info className="mr-2 h-3 w-3 shrink-0 opacity-50" />
					<span>{t("title")}</span>
				</div>
				<ChevronDown
					className={cn(
						"h-4 w-4 transition-transform",
						showHelpSection && "rotate-180",
					)}
				/>
			</button>
			{showHelpSection && (
				<div className="mt-2 space-y-3 p-2 bg-muted/50 rounded-md">
					{STATUS_ROWS.map((row) => (
						<div className="flex items-center gap-3" key={row.titleKey}>
							<TranslationProofStatusIcon
								localeStatus={row.localeStatus}
								proofStatus={row.proofStatus}
							/>
							<div className="flex-1 min-w-0">
								<div className="font-medium text-sm">{t(row.titleKey)}</div>
								<div className="text-xs text-muted-foreground break-words whitespace-normal">
									{t(row.descriptionKey)}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
