"use client";

import { Languages } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useLocale } from "use-intl";
import { wordGlossVoteResponseSchema } from "@/app/api/segment-glosses/_domain/word-glosses";
import { AddTextCandidateForm } from "../translation-section/text-candidates/add-text-candidate-form.client";
import { CandidatePanel } from "../translation-section/text-candidates/candidate-panel.client";
import { useWordGlosses } from "./use-word-glosses";

export function AddAndVoteWordGlosses({
	wordId,
	open,
}: {
	wordId: number;
	open: boolean;
}) {
	const locale = useLocale();
	const { mutate: mutateCache } = useSWRConfig();
	const { data, error, isLoading, mutate } = useWordGlosses(
		wordId,
		locale,
		open,
	);
	const [isVoting, setIsVoting] = useState(false);
	const refreshPageTranslations = async () => {
		await mutateCache(
			(key) =>
				Array.isArray(key) &&
				key[0] === "/api/segment-glosses" &&
				key[2] === locale,
		);
	};

	const refresh = async () => {
		await mutate();
		await refreshPageTranslations();
	};

	const vote = async (glossId: number, isUpvote: boolean) => {
		if (isVoting) return;
		setIsVoting(true);
		const formData = new FormData();
		formData.set("wordGlossId", String(glossId));
		formData.set("isUpvote", String(isUpvote));

		try {
			const response = await fetch("/api/segment-glosses", {
				method: "PATCH",
				body: formData,
				credentials: "same-origin",
			});
			if (response.status === 401) {
				window.location.assign(`/${locale}/auth/login`);
				return;
			}
			if (!response.ok) return;

			const body = wordGlossVoteResponseSchema.parse(await response.json());
			await mutate(body.data.glosses, { revalidate: false });
			await refreshPageTranslations();
		} catch {
			// 通信失敗時は最後にサーバーから確定した一覧を維持する。
		} finally {
			setIsVoting(false);
		}
	};

	if (!open) return null;

	if (isLoading) {
		return (
			<span className="mt-2 flex items-center justify-end text-sm text-gray-500">
				<Languages className="mr-1 h-4 w-4" /> Loading translations...
			</span>
		);
	}

	if (error) {
		return (
			<span className="mt-2 flex items-center justify-end text-sm text-red-500">
				Failed to load translations
			</span>
		);
	}

	return (
		<CandidatePanel
			addForm={
				<AddTextCandidateForm
					endpoint="/api/segment-glosses"
					hiddenFields={{ wordId, locale }}
					onAdded={refresh}
					placeholder="Or enter your translation..."
					submitLabel="Submit"
				/>
			}
			candidates={data ?? []}
			deleteConfig={{
				endpoint: "/api/segment-glosses",
				fieldName: "glossId",
			}}
			isVoting={isVoting}
			labels={{
				otherCandidates: "Other translations",
				delete: "Delete",
				deleting: "Deleting...",
			}}
			locale={locale}
			onDeleted={refresh}
			onVote={vote}
		/>
	);
}
