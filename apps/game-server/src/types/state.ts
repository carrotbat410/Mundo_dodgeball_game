import type { Session, RoomPlayer, GameMode, RoomStatus } from "@mundo/shared";

export interface RoomChatMessage {
  id: string;
  type: "user" | "system";
  senderPlayerId?: string;
  nickname?: string;
  text: string;
  createdAt: number;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  mode: GameMode;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string;
  hostPlayerId: string;
  status: RoomStatus;
  players: RoomPlayer[];
  chatMessages: RoomChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ServerState {
  sessions: Map<string, Session>;
  rooms: Map<string, Room>;
  roomCodeIndex: Map<string, string>;
}
