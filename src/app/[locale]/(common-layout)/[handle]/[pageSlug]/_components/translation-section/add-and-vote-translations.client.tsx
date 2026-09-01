"use client";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { fetchAuthedForm } from "@/app/[locale]/_utils/fetch-authed-form";
import { sanitizeTextToHtml } from "@/app/[locale]/_utils/sanitize-and-parse-text.client";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import type { ActionResponse } from "@/app/types";
import { Button } from "@/components/ui/button";
import { AddTranslationForm } from "./add-translation-form/client";
import { useSegmentTranslations } from "./hooks/use-segment-translations";
import { TranslationListItem } from "./translation-list-item/client";
import { VoteButtons } from "./vote-buttons/client";

const INITIAL_DISPLAY_COUNT = 3;

type VoteResponse = ActionResponse<{ translations: SegmentTranslation[] }>;

interface AddAndVoteTranslationsProps {
	segmentId: number;
	open: boolean;
	translationElement: HTMLElement;
}

export function AddAndVoteTranslations({
	segmentId,
	open,
	translationElement,
}: AddAndVoteTranslationsProps) {
	const t = useTranslations("TranslationSection");
	const [showAll, setShowAll] = useState(false);
	const [isVoting, setIsVoting] = useState(false);
	const userLocale = useLocale();
	const { data, error, isLoading, mutate } = useSegmentTranslations({
		segmentId,
		userLocale,
		enabled: open,
	});

	const translations = data ?? [];
	const bestTranslation = translations[0];
	const alternativeTranslations = translations.slice(1);
	const bestTranslationText = bestTranslation?.text;

	useEffect(() => {
		if (bestTranslationText !== undefined) {
			translationElement.innerHTML = sanitizeTextToHtml(bestTranslationText);
		}
	}, [bestTranslationText, translationElement]);

	const displayedTranslations = showAll
		? alternativeTranslations
		: alternativeTranslations.slice(0, INITIAL_DISPLAY_COUNT);

	const hasMoreTranslations =
		alternativeTranslations.length > INITIAL_DISPLAY_COUNT;

	const toggleShowAll = () => setShowAll((prev) => !prev);
	const vote = async (translationId: number, isUpvote: boolean) => {
		if (isVoting) return;

		setIsVoting(true);

		try {
			const response = await fetchAuthedForm({
				url: "/api/segment-translations",
				method: "PATCH",
				body: {
					segmentTranslationId: String(translationId),
					isUpvote: String(isUpvote),
				},
				locale: userLocale,
			});
			if (!response) return;

			const body = (await response.json()) as VoteResponse;
			if (response.ok && body.success) {
				await mutate(body.data.translations, { revalidate: false });
			}
		} catch {
			// 通信失敗時は最後にサーバーから確定した一覧を維持する。
		} finally {
			setIsVoting(false);
		}
	};

	if (!open) return null;

	if (isLoading) {
		return (
			<span className="w-full">
				<span className="flex mt-2 items-center justify-end text-gray-500 text-sm">
					<Languages className="w-4 h-4 mr-1" /> {t("loading")}
				</span>
			</span>
		);
	}

	if (error) {
		return (
			<span className="w-full">
				<span className="flex mt-2 items-center justify-end text-red-500 text-sm">
					{t("loadFailed")}
				</span>
			</span>
		);
	}

	if (!bestTranslation) {
		return (
			<span className="w-full">
				<AddTranslationForm onTranslationAdded={mutate} segmentId={segmentId} />
			</span>
		);
	}

	return (
		<span className="w-full ">
			<span className="flex items-center justify-end gap-2">
				<Link
					className="no-underline!"
					params={{ handle: bestTranslation.userHandle, locale: userLocale }}
					to="/$locale/$handle"
				>
					<span className="text-sm text-gray-500 text-right flex items-center">
						{t("by")} {bestTranslation.userName}
					</span>
				</Link>
				<VoteButtons
					isVoting={isVoting}
					key={bestTranslation.id}
					onVote={vote}
					voteTarget={bestTranslation}
				/>
			</span>
			<span className="flex mt-2 items-center justify-end text-gray-500 text-sm">
				<Languages className="w-4 h-4 mr-1" /> {t("otherTranslations")}
			</span>
			{displayedTranslations.map((displayedTranslation) => (
				<TranslationListItem
					isVoting={isVoting}
					key={displayedTranslation.id}
					locale={userLocale}
					onDeleted={() => {
						void mutate();
					}}
					onVote={vote}
					translation={displayedTranslation}
				/>
			))}
			{hasMoreTranslations && (
				<Button
					className="mt-2 w-full text-sm"
					onClick={toggleShowAll}
					variant="link"
				>
					{showAll ? (
						<ChevronUp className="mr-1" size={16} />
					) : (
						<ChevronDown className="mr-1" size={16} />
					)}
				</Button>
			)}
			<span className="mt-4">
				<AddTranslationForm onTranslationAdded={mutate} segmentId={segmentId} />
			</span>
		</span>
	);
}
