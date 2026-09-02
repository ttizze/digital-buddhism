import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";
import { startTransition, useState } from "react";
import useSWR from "swr";
import { useLocale, useTranslations } from "use-intl";
import * as v from "valibot";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { TranslationProofStatus } from "@/drizzle/types";
import { cn } from "@/lib/utils";
import { AddTranslateDialog } from "./add-translate-dialog/client";
import { TranslationProofStatusIcon } from "./component/translation-proof-status-icon";
import { TextStatusGuide } from "./component/translation-status-guide";
import { buildLocaleOptions } from "./domain/build-locale-options";

// Local types
const proofStatusValues = [
	"MACHINE_DRAFT",
	"HUMAN_TOUCHED",
	"PROOFREAD",
	"VALIDATED",
] as const satisfies readonly TranslationProofStatus[];

const translationInfoSchema = v.object({
	sourceLocale: v.string(),
	translatedLocales: v.array(v.string()),
	translationProofs: v.array(
		v.object({
			locale: v.string(),
			translationProofStatus: v.picklist(proofStatusValues),
		}),
	),
});

type TranslationInfo = v.InferOutput<typeof translationInfoSchema>;

// Helpers
const buildSlugKey = ({ pageSlug }: { pageSlug?: string }) =>
	pageSlug ? `pageSlug=${pageSlug}` : null;

const fetchTranslation: (url: string) => Promise<TranslationInfo> = async (
	url,
) => {
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return v.parse(translationInfoSchema, await res.json());
};

// Props
interface LocaleSelectorProps {
	localeSelectorClassName?: string;
	currentHandle?: string;
	userPlan: string;
}

//TODO: radix uiのせいで開発環境のモバイルで文字がぼける iphoneではボケてない､その他実機でもボケてたら対応する
export function LocaleSelector({
	localeSelectorClassName,
	currentHandle,
	userPlan,
}: LocaleSelectorProps) {
	const t = useTranslations("LocaleSelector");
	const [open, setOpen] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const targetLocale = useLocale();
	const { locale: routeLocale, pageSlug } = useParams({ strict: false }) as {
		locale?: string;
		pageSlug?: string;
	};
	const currentLocale = routeLocale ?? targetLocale;
	const handleLocaleChange = (value: string) => {
		setOpen(false);
		startTransition(() => {
			const localePrefix = `/${currentLocale}`;
			const pathWithoutLocale =
				location.pathname === localePrefix ||
				location.pathname === `${localePrefix}/`
					? ""
					: location.pathname.startsWith(`${localePrefix}/`)
						? location.pathname.slice(localePrefix.length)
						: location.pathname;
			const nextPath = `/${value}${pathWithoutLocale}`;
			const suffix = `${location.searchStr}${location.hash ? `#${location.hash}` : ""}`;
			void navigate({ to: `${nextPath}${suffix}` });
		});
	};

	const showIcons = Boolean(pageSlug);
	const showAddNewButton = Boolean(pageSlug);

	const slugKey = buildSlugKey({ pageSlug });
	const apiUrl = slugKey ? `/api/locale-info?${slugKey}` : null;

	const { data } = useSWR(apiUrl, fetchTranslation);

	const { sourceLocale, translatedLocales, translationProofs } = data ?? {};

	// Build a map of locale => proof status using Kysely enum values directly
	const proofStatusMap = Object.fromEntries(
		(translationProofs ?? []).map<[string, TranslationProofStatus]>((p) => [
			p.locale,
			p.translationProofStatus,
		]),
	) as Record<string, TranslationProofStatus>;

	const localeOptionWithStatus = buildLocaleOptions({
		sourceLocale,
		existLocales: translatedLocales ?? [],
		supported: supportedLocaleOptions,
		proofStatusMap,
	});

	const selectedOption = localeOptionWithStatus.find(
		(item) => item.code === targetLocale,
	);

	return (
		<div>
			<Popover onOpenChange={setOpen} open={open}>
				<PopoverTrigger asChild>
					<button
						className={cn(
							"flex justify-between items-center opacity-100 w-full rounded-none px-4 py-2  cursor-pointer hover:bg-accent hover:text-accent-foreground",
							localeSelectorClassName,
						)}
						data-testid="locale-selector-button"
						type="button"
					>
						<div className="flex items-center">
							{showIcons && sourceLocale && (
								<TranslationProofStatusIcon
									localeStatus={selectedOption?.status ?? "untranslated"}
									proofStatus={selectedOption?.proofStatus}
								/>
							)}
							<span className="truncate">
								{selectedOption?.name ?? t("select")}
							</span>
						</div>
						<ChevronDown
							className={cn(
								"ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
								open && "rotate-180",
							)}
						/>
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-60 p-0  truncate" sideOffset={-4}>
					<Command>
						<CommandInput placeholder={t("searchPlaceholder")} />
						<CommandList>
							{pageSlug && (
								<>
									<TextStatusGuide />
									<Separator />
								</>
							)}
							<CommandEmpty>{t("empty")}</CommandEmpty>
							<CommandGroup>
								{localeOptionWithStatus.map((item) => (
									<CommandItem
										key={item.code}
										onSelect={handleLocaleChange}
										value={item.code}
									>
										{showIcons && sourceLocale && (
											<TranslationProofStatusIcon
												localeStatus={item.status}
												proofStatus={item.proofStatus}
											/>
										)}
										<span className="truncate grow">{item.name}</span>
										{targetLocale === item.code && (
											<Check className="ml-2 h-4 w-4" />
										)}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
						{showAddNewButton && (
							<>
								<Separator />
								<div className="flex justify-center m-2">
									<Button
										className="rounded-full"
										onClick={() => setDialogOpen(true)}
										variant="default"
									>
										{t("addNew")}
									</Button>
								</div>
							</>
						)}
					</Command>
				</PopoverContent>
			</Popover>
			{pageSlug && (
				<AddTranslateDialog
					currentHandle={currentHandle}
					onOpenChange={setDialogOpen}
					open={dialogOpen}
					pageSlug={pageSlug}
					userPlan={userPlan}
				/>
			)}
		</div>
	);
}
