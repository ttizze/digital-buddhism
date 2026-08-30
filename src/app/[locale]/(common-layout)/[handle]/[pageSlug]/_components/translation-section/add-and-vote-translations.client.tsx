"use client";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "use-intl";
import { Button } from "@/components/ui/button";
import { AddTranslationForm } from "./add-translation-form/client";
import { useSegmentTranslations } from "./hooks/use-segment-translations";
import { TranslationListItem } from "./translation-list-item/client";
import { VoteButtons } from "./vote-buttons/client";

const INITIAL_DISPLAY_COUNT = 3;

interface AddAndVoteTranslationsProps {
	segmentId: number;
	open: boolean;
	onBestTranslationChanged?: (text: string) => void;
}

export function AddAndVoteTranslations({
	segmentId,
	open,
	onBestTranslationChanged,
}: AddAndVoteTranslationsProps) {
	const [showAll, setShowAll] = useState(false);
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
			onBestTranslationChanged?.(bestTranslationText);
		}
	}, [bestTranslationText, onBestTranslationChanged]);

	const displayedTranslations = showAll
		? alternativeTranslations
		: alternativeTranslations.slice(0, INITIAL_DISPLAY_COUNT);

	const hasMoreTranslations =
		alternativeTranslations.length > INITIAL_DISPLAY_COUNT;

	const toggleShowAll = () => setShowAll((prev) => !prev);
	const refreshAfterVote = async () => {
		const refreshedTranslations = await mutate();
		const refreshedBestTranslation = refreshedTranslations?.[0];
		if (refreshedBestTranslation) {
			onBestTranslationChanged?.(refreshedBestTranslation.text);
		}
	};

	if (!open) return null;

	if (isLoading) {
		return (
			<span className="w-full">
				<span className="flex mt-2 items-center justify-end text-gray-500 text-sm">
					<Languages className="w-4 h-4 mr-1" /> Loading translations...
				</span>
			</span>
		);
	}

	if (error) {
		return (
			<span className="w-full">
				<span className="flex mt-2 items-center justify-end text-red-500 text-sm">
					Failed to load translations
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
						by: {bestTranslation.userName}
					</span>
				</Link>
				<VoteButtons
					key={bestTranslation.id}
					locale={userLocale}
					onVoted={refreshAfterVote}
					translation={bestTranslation}
				/>
			</span>
			<span className="flex mt-2 items-center justify-end text-gray-500 text-sm">
				<Languages className="w-4 h-4 mr-1" /> Other translations
			</span>
			{displayedTranslations.map((displayedTranslation) => (
				<TranslationListItem
					key={displayedTranslation.id}
					locale={userLocale}
					onDeleted={() => {
						void mutate();
					}}
					onVoted={refreshAfterVote}
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
