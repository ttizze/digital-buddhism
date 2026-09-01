import { FileText, FileX, Languages } from "lucide-react";
import type { TranslationProofStatus } from "@/drizzle/types";
import { cn } from "@/lib/utils";
import type { LocaleStatus } from "../domain/build-locale-options";

interface Props {
	localeStatus: LocaleStatus;
	proofStatus?: TranslationProofStatus;
}

// 統合された色マップ
const colorMap = {
	// ロケールステータス別の色
	source: "text-blue-500",
	untranslated: "text-gray-400",
	translated: "text-red-500",
	// 翻訳証明ステータス別の色
	MACHINE_DRAFT: "text-rose-500",
	HUMAN_TOUCHED: "text-orange-400",
	PROOFREAD: "text-amber-400",
	VALIDATED: "text-emerald-500",
} as const;

const iconMap = {
	source: FileText,
	untranslated: FileX,
	translated: Languages,
} as const;

export function TranslationProofStatusIcon({
	localeStatus,
	proofStatus,
}: Props) {
	// proofStatus 未指定時は MACHINE_DRAFT とみなす
	const effectiveProofStatus = proofStatus ?? "MACHINE_DRAFT";
	const IconComponent = iconMap[localeStatus] ?? FileX;
	const colorClass =
		localeStatus === "translated"
			? colorMap[effectiveProofStatus]
			: colorMap[localeStatus];

	return (
		<IconComponent
			className={cn("w-4 h-4 mr-2", colorClass)}
			data-testid={`${localeStatus === "translated" ? `proof-${effectiveProofStatus}` : localeStatus}-icon`}
		/>
	);
}
