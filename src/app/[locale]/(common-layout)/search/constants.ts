export const CATEGORIES = ["title", "user", "content"] as const;
export type Category = (typeof CATEGORIES)[number];
