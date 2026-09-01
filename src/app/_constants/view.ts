export const VIEW_VALUES = ["user", "source", "both"] as const;
export type View = (typeof VIEW_VALUES)[number];
export const DEFAULT_VIEW: View = "both";
