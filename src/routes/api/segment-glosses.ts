import { createFileRoute } from "@tanstack/react-router";
import {
	deleteWordGloss,
	getSegmentGlosses,
	patchWordGlossVote,
	postWordGloss,
} from "@/app/api/segment-glosses/handler";

export const Route = createFileRoute("/api/segment-glosses")({
	server: {
		handlers: {
			GET: ({ request }) => getSegmentGlosses(request),
			POST: ({ request }) => postWordGloss(request),
			PATCH: ({ request }) => patchWordGlossVote(request),
			DELETE: ({ request }) => deleteWordGloss(request),
		},
	},
});
