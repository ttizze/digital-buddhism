"use client";

import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
import { StartButton } from "@/app/[locale]/(common-layout)/_components/start-button";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { type TranslateActionState, translateAction } from "./action";
import { DialogLocaleSelector } from "./dialog-locale-selector";

type AddTranslateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentHandle: string | undefined;
	pageSlug: string;
	userPlan: string;
};

export function AddTranslateDialog({
	open,
	onOpenChange,
	currentHandle,
	pageSlug,
	userPlan,
}: AddTranslateDialogProps) {
	const currentLocale = useLocale();
	const t = useTranslations("AddTranslateDialog");
	const translateActionFn = useServerFn(translateAction);
	const [translateState, action, isTranslating] = useActionState<
		TranslateActionState,
		FormData
	>(async (_prev, formData) => translateActionFn({ data: formData }), {
		success: false,
	});
	const [targetLocale, setTargetLocale] = useState(currentLocale);
	const isPremium = userPlan === "premium";
	const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite");
	const { toastJobs } = useTranslationJobs(
		translateState.success ? (translateState.data?.translationJobs ?? []) : [],
	);

	useTranslationJobToast(toastJobs);
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="rounded-xl">
				{!currentHandle ? (
					<div className="text-center">
						<DialogHeader>
							<DialogTitle className="text-lg text-center mb-4">
								{t("loginTitle")}
							</DialogTitle>
						</DialogHeader>
						<StartButton />
					</div>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>{t("title")}</DialogTitle>
						</DialogHeader>
						<div className="space-y-2">
							<Label htmlFor="language">{t("language")}</Label>
							<DialogLocaleSelector
								onChange={(value) => setTargetLocale(value)}
								targetLocale={targetLocale}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="ai-model">{t("aiModel")}</Label>
							<Select
								onValueChange={(value) => setSelectedModel(value)}
								value={selectedModel}
							>
								<SelectTrigger className="rounded-xl">
									<SelectValue placeholder={t("selectModelPlaceholder")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="gemini-3.1-flash-lite">
										Gemini 3.1 Flash Lite
									</SelectItem>
									{isPremium && (
										<>
											<SelectItem value="gemini-3.7-flash">
												Gemini 3.7 Flash
											</SelectItem>
											<SelectItem value="gemini-3.1-pro-preview">
												Gemini 3.1 Pro Preview
											</SelectItem>
											<SelectItem value="gpt-5-nano-2025-08-07">
												GPT-5 Nano
											</SelectItem>
											<SelectItem value="deepseek-reasoner">
												DeepSeek Reasoner (Thinking Mode)
											</SelectItem>
										</>
									)}
								</SelectContent>
							</Select>
						</div>

						<form action={action}>
							<input name="targetLocale" type="hidden" value={targetLocale} />
							<input name="pageSlug" type="hidden" value={pageSlug} />
							<input name="aiModel" type="hidden" value={selectedModel} />
							<Button className="w-full" disabled={isTranslating} type="submit">
								{isTranslating ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									t("translate")
								)}
							</Button>
						</form>
						{translateState.message && (
							<p className="text-red-500">{translateState.message}</p>
						)}
						{!translateState.success &&
							translateState.validationErrors?.pageSlug && (
								<p className="text-red-500">
									{translateState.validationErrors.pageSlug[0]}
								</p>
							)}

						{!translateState.success &&
							translateState.validationErrors?.aiModel && (
								<p className="text-red-500">
									{translateState.validationErrors.aiModel[0]}
								</p>
							)}
						{!translateState.success &&
							translateState.validationErrors?.targetLocale && (
								<p className="text-red-500">
									{translateState.validationErrors.targetLocale[0]}
								</p>
							)}
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
