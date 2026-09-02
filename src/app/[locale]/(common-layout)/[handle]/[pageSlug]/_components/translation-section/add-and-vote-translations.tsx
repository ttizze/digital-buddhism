import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import type { ActionResponse } from "@/app/types";
import { Button } from "@/components/ui/button";
import { useVoteRequest } from "../use-vote-request";
import { AddTranslationForm } from "./add-translation-form/client";
import { useSegmentTranslations } from "./hooks/use-segment-translations";
import { TranslationListItem } from "./translation-list-item/client";
import { VoteButtons } from "./vote-buttons/client";

const INITIAL_DISPLAY_COUNT = 3;

type VoteResponse = ActionResponse<{ translations: SegmentTranslation[] }>;

interface AddAndVoteTranslationsProps {
	readonly segmentId: number;
	readonly translationElement: HTMLElement;
}

export function AddAndVoteTranslations({
	segmentId,
	translationElement,
}: AddAndVoteTranslationsProps) {
	const t = useTranslations("TranslationSection");
	const [showAll, setShowAll] = useState(false);
	const userLocale = useLocale();
	const { data, error, isLoading, mutate } = useSegmentTranslations({
		segmentId,
		userLocale,
		enabled: true,
	});

	const translations = data ?? [];
	const bestTranslation = translations[0];
	const alternativeTranslations = translations.slice(1);
	const bestTranslationText = bestTranslation?.text;

	useEffect(() => {
		if (bestTranslationText !== undefined) {
			translationElement.textContent = bestTranslationText;
		}
	}, [bestTranslationText, translationElement]);

	const displayedTranslations = showAll
		? alternativeTranslations
		: alternativeTranslations.slice(0, INITIAL_DISPLAY_COUNT);

	const hasMoreTranslations =
		alternativeTranslations.length > INITIAL_DISPLAY_COUNT;

	const toggleShowAll = () => setShowAll((prev) => !prev);
	const { vote, votingTargetId } = useVoteRequest<VoteResponse>({
		url: "/api/segment-translations",
		targetField: "segmentTranslationId",
		locale: userLocale,
		parseResponse: (value) => value as VoteResponse,
		onSuccess: async (body) => {
			if (body.success) {
				await mutate(body.data.translations, { revalidate: false });
			}
		},
	});
	const isVoting = votingTargetId !== null;

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
