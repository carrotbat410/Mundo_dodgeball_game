import type {
  GameMode,
  GameResult,
  GameStatus,
  RoomPlayer,
  RoomStatus,
  Session,
  Team
} from "@mundo/shared";

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

export interface GamePlayer {
  playerId: string;
  guestId: string;
  socketId: string;
  nickname: string;
  team: Team;
  x: number;
  y: number;
  facingAngle: number;
  hp: number;
  alive: boolean;
  qCooldownRemaining: number;
  castLockRemaining: number;
  moveTargetX: number | null;
  moveTargetY: number | null;
}

export interface Projectile {
  id: string;
  ownerPlayerId: string;
  team: Team;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  dirX: number;
  dirY: number;
  speed: number;
  radius: number;
  remainingLifetime: number;
}

export interface Game {
  roomId: string;
  mode: GameMode;
  status: GameStatus;
  countdownRemaining: number;
  remainingTime: number;
  players: GamePlayer[];
  projectiles: Projectile[];
  result: GameResult | null;
  resultDelayRemaining: number;
}

export interface ServerState {
  sessions: Map<string, Session>;
  rooms: Map<string, Room>;
  roomCodeIndex: Map<string, string>;
  games: Map<string, Game>;
}
