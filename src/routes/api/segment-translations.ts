import { createFileRoute } from "@tanstack/react-router";
import {
	deleteSegmentTranslation,
	getSegmentTranslations,
	patchSegmentTranslationVote,
	postSegmentTranslation,
} from "@/app/api/segment-translations/handler";

export const Route = createFileRoute("/api/segment-translations")({
	server: {
		handlers: {
			GET: ({ request }) => getSegmentTranslations(request),
			POST: ({ request }) => postSegmentTranslation(request),
			PATCH: ({ request }) => patchSegmentTranslationVote(request),
			DELETE: ({ request }) => deleteSegmentTranslation(request),
		},
	},
});
