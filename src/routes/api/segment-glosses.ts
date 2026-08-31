import { createFileRoute } from "@tanstack/react-router";
import {
	getSegmentGlosses,
	patchSegmentGlossVote,
} from "@/app/api/segment-glosses/handler";

export const Route = createFileRoute("/api/segment-glosses")({
	server: {
		handlers: {
			GET: ({ request }) => getSegmentGlosses(request),
			PATCH: ({ request }) => patchSegmentGlossVote(request),
		},
	},
});
