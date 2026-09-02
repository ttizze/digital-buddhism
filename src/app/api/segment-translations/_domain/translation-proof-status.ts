import type { TranslationProofStatus } from "@/drizzle/types";

export function calcProofStatus(
	totalSegments: number,
	segmentsWith1PlusVotes: number,
	segmentsWith2PlusVotes: number,
): TranslationProofStatus {
	if (segmentsWith1PlusVotes === 0) return "MACHINE_DRAFT";
	if (segmentsWith1PlusVotes < totalSegments) return "HUMAN_TOUCHED";
	if (segmentsWith2PlusVotes === totalSegments) return "VALIDATED";
	return "PROOFREAD";
}
