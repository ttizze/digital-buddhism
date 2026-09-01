"use client";
import { Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "use-intl";
import { sanitizeTextToHtml } from "@/app/[locale]/_utils/sanitize-and-parse-text.client";
import type { SegmentTranslation } from "@/app/api/segment-translations/_domain/segment-translations";
import type { ActionResponse } from "@/app/types";
import { AddTranslationForm } from "./add-translation-form/client";
import { useSegmentTranslations } from "./hooks/use-segment-translations";
import { CandidatePanel } from "./text-candidates/candidate-panel.client";

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
	const [isVoting, setIsVoting] = useState(false);
	const userLocale = useLocale();
	const { data, error, isLoading, mutate } = useSegmentTranslations({
		segmentId,
		userLocale,
		enabled: open,
	});

	const translations = data ?? [];
	const bestTranslation = translations[0];
	const bestTranslationText = bestTranslation?.text;

	useEffect(() => {
		if (bestTranslationText !== undefined) {
			translationElement.innerHTML = sanitizeTextToHtml(bestTranslationText);
		}
	}, [bestTranslationText, translationElement]);

	const vote = async (translationId: number, isUpvote: boolean) => {
		if (isVoting) return;

		setIsVoting(true);
		const formData = new FormData();
		formData.set("segmentTranslationId", String(translationId));
		formData.set("isUpvote", String(isUpvote));

		try {
			const response = await fetch("/api/segment-translations", {
				method: "PATCH",
				body: formData,
				credentials: "same-origin",
			});

			if (response.status === 401) {
				window.location.assign(`/${userLocale}/auth/login`);
				return;
			}

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

	return (
		<CandidatePanel
			addForm={
				<AddTranslationForm onTranslationAdded={mutate} segmentId={segmentId} />
			}
			candidates={translations}
			deleteConfig={{
				endpoint: "/api/segment-translations",
				fieldName: "translationId",
			}}
			isVoting={isVoting}
			labels={{
				otherCandidates: "Other translations",
				delete: "Delete",
				deleting: "Deleting...",
			}}
			locale={userLocale}
			onDeleted={async () => {
				await mutate();
			}}
			onVote={vote}
		/>
	);
}
