"use client";

import { Link } from "@tanstack/react-router";
import {
	ChevronDown,
	ChevronUp,
	EllipsisVertical,
	Languages,
	Trash2,
} from "lucide-react";
import { type FormEvent, type ReactNode, useRef, useState } from "react";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { sanitizeAndParseText } from "@/app/[locale]/_utils/sanitize-and-parse-text.client";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VoteButtons, type VoteTarget } from "../vote-buttons/client";

const INITIAL_DISPLAY_COUNT = 3;

export type TextCandidate = VoteTarget & {
	text: string;
	userName: string;
	userHandle: string;
};

type CandidatePanelLabels = {
	otherCandidates: string;
	delete: string;
	deleting: string;
};

type DeleteConfig = {
	endpoint: string;
	fieldName: string;
};

export function CandidatePanel({
	candidates,
	isVoting,
	onVote,
	onDeleted,
	addForm,
	locale,
	labels,
	deleteConfig,
}: {
	candidates: TextCandidate[];
	isVoting: boolean;
	onVote: (candidateId: number, isUpvote: boolean) => void;
	onDeleted: () => unknown | Promise<unknown>;
	addForm: ReactNode;
	locale: string;
	labels: CandidatePanelLabels;
	deleteConfig: DeleteConfig;
}) {
	const [showAll, setShowAll] = useState(false);
	const bestCandidate = candidates[0];
	const alternativeCandidates = candidates.slice(1);
	const displayedCandidates = showAll
		? alternativeCandidates
		: alternativeCandidates.slice(0, INITIAL_DISPLAY_COUNT);

	if (!bestCandidate) return <span className="w-full">{addForm}</span>;

	return (
		<span className="w-full">
			<span className="flex items-center justify-end gap-2">
				<CandidateAuthor candidate={bestCandidate} locale={locale} />
				<VoteButtons
					isVoting={isVoting}
					onVote={onVote}
					voteTarget={bestCandidate}
				/>
			</span>
			<span className="mt-2 flex items-center justify-end text-sm text-gray-500">
				<Languages className="mr-1 h-4 w-4" /> {labels.otherCandidates}
			</span>
			{displayedCandidates.map((candidate) => (
				<CandidateListItem
					candidate={candidate}
					deleteConfig={deleteConfig}
					isVoting={isVoting}
					key={candidate.id}
					labels={labels}
					locale={locale}
					onDeleted={onDeleted}
					onVote={onVote}
				/>
			))}
			{alternativeCandidates.length > INITIAL_DISPLAY_COUNT && (
				<Button
					className="mt-2 w-full text-sm"
					onClick={() => setShowAll((current) => !current)}
					variant="link"
				>
					{showAll ? (
						<ChevronUp className="mr-1" size={16} />
					) : (
						<ChevronDown className="mr-1" size={16} />
					)}
				</Button>
			)}
			<span className="mt-4 block">{addForm}</span>
		</span>
	);
}

function CandidateListItem({
	candidate,
	isVoting,
	onVote,
	onDeleted,
	locale,
	labels,
	deleteConfig,
}: {
	candidate: TextCandidate;
	isVoting: boolean;
	onVote: (candidateId: number, isUpvote: boolean) => void;
	onDeleted: () => unknown | Promise<unknown>;
	locale: string;
	labels: CandidatePanelLabels;
	deleteConfig: DeleteConfig;
}) {
	const hydrated = useHydrated();
	const { data: session } = authClient.useSession();
	const currentUser = hydrated ? session?.user : undefined;
	const isOwner = currentUser?.handle === candidate.userHandle;
	const deletingRef = useRef(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (deletingRef.current) return;
		deletingRef.current = true;
		setIsDeleting(true);

		try {
			const response = await fetch(deleteConfig.endpoint, {
				method: "DELETE",
				body: new FormData(event.currentTarget),
				credentials: "same-origin",
			});
			if (response.status === 401) {
				window.location.assign(`/${locale}/auth/login`);
				return;
			}
			if (response.ok) await onDeleted();
		} finally {
			deletingRef.current = false;
			setIsDeleting(false);
		}
	};

	return (
		<span className="mt-1 block pl-4">
			<span className="flex items-start justify-between">
				<span className="flex">
					<span className="w-5 shrink-0 text-2xl">•</span>
					<span>{sanitizeAndParseText(candidate.text)}</span>
				</span>
				{isOwner && (
					<DropdownMenu modal={false}>
						<DropdownMenuTrigger asChild>
							<Button className="h-8 w-8 p-0" type="button" variant="ghost">
								<EllipsisVertical className="h-6 w-6 text-gray-400" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<form onSubmit={handleDelete}>
								<input
									name={deleteConfig.fieldName}
									type="hidden"
									value={candidate.id}
								/>
								<DropdownMenuItem asChild>
									<button
										className="flex w-full cursor-pointer items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
										disabled={isDeleting}
										type="submit"
									>
										<Trash2 className="h-4 w-4" />
										{isDeleting ? labels.deleting : labels.delete}
									</button>
								</DropdownMenuItem>
							</form>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</span>
			<span className="flex items-center justify-end">
				<CandidateAuthor candidate={candidate} locale={locale} />
				<VoteButtons
					isVoting={isVoting}
					onVote={onVote}
					voteTarget={candidate}
				/>
			</span>
		</span>
	);
}

function CandidateAuthor({
	candidate,
	locale,
}: {
	candidate: TextCandidate;
	locale: string;
}) {
	return (
		<Link
			className="mr-2 flex items-center no-underline!"
			params={{ handle: candidate.userHandle, locale }}
			to="/$locale/$handle"
		>
			<span className="flex items-center justify-end text-right text-sm text-gray-500">
				by: {candidate.userName}
			</span>
		</Link>
	);
}
