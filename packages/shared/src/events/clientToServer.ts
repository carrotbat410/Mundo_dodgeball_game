import type { GameMode } from "../game/modes";
import type { Team } from "../game/teams";

export interface RoomSettingsPayload {
  name: string;
  mode: GameMode;
  isPrivate: boolean;
  password?: string;
}

export interface ClientToServerEvents {
  "guest:enter": (payload: { nickname: string; locale: "ko" | "en" }) => void;
  "lobby:list": () => void;
  "lobby:join-by-code": (payload: { roomCode: string; password?: string }) => void;
  "room:create": (payload: RoomSettingsPayload) => void;
  "room:join": (payload: { roomId: string }) => void;
  "room:join-private": (payload: { roomId: string; password: string }) => void;
  "room:get-state": (payload: { roomId: string }) => void;
  "room:change-team": (payload: { team: Team }) => void;
  "room:set-ready": (payload: { isReady: boolean }) => void;
  "room:chat": (payload: { message: string }) => void;
  "room:leave": () => void;
  "room:start-game": () => void;
  "room:kick-player": (payload: { targetPlayerId: string }) => void;
  "room:update-settings": (payload: RoomSettingsPayload) => void;
  "game:get-state": (payload: { roomId: string }) => void;
  "game:move": (payload: { targetX: number; targetY: number }) => void;
}
