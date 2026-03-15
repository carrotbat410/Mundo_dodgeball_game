import type { GameMode } from "../game/modes";
import type { Team } from "../game/teams";

export type RoomStatus = "waiting" | "countdown" | "playing";

export interface RoomPlayer {
  playerId: string;
  guestId: string;
  socketId: string;
  nickname: string;
  team: Team;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
}

export interface RoomSummary {
  roomId: string;
  roomCode: string;
  name: string;
  mode: GameMode;
  status: RoomStatus;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
}

export interface RoomState {
  room: {
    roomId: string;
    roomCode: string;
    name: string;
    mode: GameMode;
    status: RoomStatus;
    isPrivate: boolean;
    hostPlayerId: string;
  };
  players: RoomPlayer[];
}
