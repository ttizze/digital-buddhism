import * as v from "valibot";

export const positiveIntegerFromString = v.pipe(
	v.string(),
	v.toNumber(),
	v.integer(),
	v.minValue(1),
);

export const voteValueFromString = v.pipe(
	v.picklist(["true", "false"]),
	v.transform((value) => value === "true"),
);
