import { describe, expect, it } from "vite-plus/test";
import { calcProofStatus } from "./translation-proof-status";

describe("calcProofStatus", () => {
	it.each([
		[10, 0, 0, "MACHINE_DRAFT"],
		[10, 5, 2, "HUMAN_TOUCHED"],
		[10, 10, 10, "VALIDATED"],
		[10, 10, 8, "PROOFREAD"],
		[0, 0, 0, "MACHINE_DRAFT"],
	] as const)(
		"total=%i, 1票以上=%i, 2票以上=%iなら%s",
		(total, onePlus, twoPlus, expected) => {
			expect(calcProofStatus(total, onePlus, twoPlus)).toBe(expected);
		},
	);
});
