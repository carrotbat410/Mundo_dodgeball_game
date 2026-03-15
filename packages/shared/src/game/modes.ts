export const GAME_MODES = ["1v1", "2v2", "3v3"] as const;

export type GameMode = (typeof GAME_MODES)[number];

export const MODE_MAX_PLAYERS: Record<GameMode, number> = {
  "1v1": 2,
  "2v2": 4,
  "3v3": 6
};

export const TEAM_SIZE_BY_MODE: Record<GameMode, number> = {
  "1v1": 1,
  "2v2": 2,
  "3v3": 3
};
