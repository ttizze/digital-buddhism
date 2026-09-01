import { parseAsStringLiteral } from "nuqs";
import { DEFAULT_VIEW, VIEW_VALUES } from "@/app/_constants/view";

export const viewQueryState = parseAsStringLiteral(VIEW_VALUES)
	.withDefault(DEFAULT_VIEW)
	.withOptions({ shallow: true });
