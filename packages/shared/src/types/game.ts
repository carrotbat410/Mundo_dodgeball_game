import type { GameMode } from "../game/modes";
import type { Team } from "../game/teams";

export type GameStatus = "countdown" | "playing" | "finished";

export interface GamePlayerSnapshot {
  playerId: string;
  nickname: string;
  team: Team;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
}

export interface GameStateSnapshot {
  roomId: string;
  mode: GameMode;
  status: GameStatus;
  countdownRemaining: number;
  remainingTime: number;
  players: GamePlayerSnapshot[];
}
