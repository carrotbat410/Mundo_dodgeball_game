import type { GameMode } from "../game/modes";
import type { Team } from "../game/teams";

export type GameStatus = "countdown" | "playing" | "finished";
export type GameResult = "blue_win" | "red_win" | "draw";

export interface GamePlayerSnapshot {
  playerId: string;
  nickname: string;
  team: Team;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  qCooldownRemaining: number;
}

export interface ProjectileSnapshot {
  projectileId: string;
  ownerPlayerId: string;
  team: Team;
  x: number;
  y: number;
}

export interface GameStateSnapshot {
  roomId: string;
  mode: GameMode;
  status: GameStatus;
  countdownRemaining: number;
  remainingTime: number;
  players: GamePlayerSnapshot[];
  projectiles: ProjectileSnapshot[];
  result: GameResult | null;
  resultDelayRemaining: number;
}
