"use client";

import { useLocale } from "use-intl";
import { AddTextCandidateForm } from "../text-candidates/add-text-candidate-form.client";

interface AddTranslationFormProps {
	segmentId: number;
	onTranslationAdded?: () => unknown | Promise<unknown>;
}

export function AddTranslationForm({
	segmentId,
	onTranslationAdded,
}: AddTranslationFormProps) {
	const locale = useLocale();
	return (
		<AddTextCandidateForm
			endpoint="/api/segment-translations"
			hiddenFields={{ segmentId, locale }}
			onAdded={onTranslationAdded}
			placeholder="Or enter your translation..."
			submitLabel="Submit"
		/>
	);
}
