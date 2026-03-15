export const TEAMS = ["blue", "red"] as const;

export type Team = (typeof TEAMS)[number];
