import {
  MAX_ROOM_NAME_LENGTH,
  MAX_ROOM_PASSWORD_LENGTH,
  MIN_ROOM_PASSWORD_LENGTH,
  MODE_MAX_PLAYERS,
  TEAM_SIZE_BY_MODE,
  type GameMode,
  type RoomPlayer,
  type RoomState,
  type RoomSettingsPayload,
  type Session,
  type Team
} from "@mundo/shared";
import type { Room } from "../types/state.js";
import { createId, createRoomCode } from "./ids.js";
import { serverState } from "../state/serverState.js";

function countTeamPlayers(room: Room, team: Team) {
  return room.players.filter((player) => player.team === team).length;
}

function pickAutoTeam(room: Room): Team {
  const blueCount = countTeamPlayers(room, "blue");
  const redCount = countTeamPlayers(room, "red");

  return blueCount <= redCount ? "blue" : "red";
}

function validateRoomSettings(payload: RoomSettingsPayload) {
  const trimmedName = payload.name.trim();
  const trimmedPassword = payload.password?.trim() ?? "";

  if (!trimmedName || trimmedName.length > MAX_ROOM_NAME_LENGTH) {
    throw new Error("INVALID_ROOM_NAME");
  }

  if (payload.isPrivate) {
    if (
      trimmedPassword.length < MIN_ROOM_PASSWORD_LENGTH ||
      trimmedPassword.length > MAX_ROOM_PASSWORD_LENGTH
    ) {
      throw new Error("INVALID_ROOM_PASSWORD");
    }
  }

  return {
    name: trimmedName,
    mode: payload.mode,
    isPrivate: payload.isPrivate,
    password: payload.isPrivate ? trimmedPassword : undefined
  } satisfies RoomSettingsPayload;
}

function ensureModeFitsCurrentPlayers(room: Room, nextMode: GameMode) {
  if (room.players.length > MODE_MAX_PLAYERS[nextMode]) {
    throw new Error("ROOM_MODE_TOO_SMALL");
  }

  const nextTeamSize = TEAM_SIZE_BY_MODE[nextMode];

  if (countTeamPlayers(room, "blue") > nextTeamSize || countTeamPlayers(room, "red") > nextTeamSize) {
    throw new Error("TEAM_LAYOUT_TOO_LARGE");
  }
}

export function createRoom(session: Session, payload: RoomSettingsPayload) {
  const roomId = createId("room");
  const code = createRoomCode();
  const playerId = createId("player");
  const normalized = validateRoomSettings(payload);

  const player: RoomPlayer = {
    playerId,
    guestId: session.guestId,
    socketId: session.socketId,
    nickname: session.nickname,
    team: "blue",
    isHost: true,
    isReady: false,
    joinedAt: Date.now()
  };

  const room: Room = {
    id: roomId,
    code,
    name: normalized.name,
    mode: normalized.mode,
    maxPlayers: MODE_MAX_PLAYERS[normalized.mode],
    isPrivate: normalized.isPrivate,
    password: normalized.password,
    hostPlayerId: playerId,
    status: "waiting",
    players: [player],
    chatMessages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  serverState.rooms.set(roomId, room);
  serverState.roomCodeIndex.set(code, roomId);

  session.currentRoomId = roomId;

  return room;
}

export function updateRoomSettings(room: Room, payload: RoomSettingsPayload) {
  const normalized = validateRoomSettings(payload);

  ensureModeFitsCurrentPlayers(room, normalized.mode);

  room.name = normalized.name;
  room.mode = normalized.mode;
  room.maxPlayers = MODE_MAX_PLAYERS[normalized.mode];
  room.isPrivate = normalized.isPrivate;
  room.password = normalized.password;
  room.updatedAt = Date.now();

  room.players = room.players.map((player) =>
    player.isHost
      ? player
      : {
          ...player,
          isReady: false
        }
  );

  return room;
}

export function toRoomState(room: Room): RoomState {
  return {
    room: {
      roomId: room.id,
      roomCode: room.code,
      name: room.name,
      mode: room.mode,
      status: room.status,
      isPrivate: room.isPrivate,
      hostPlayerId: room.hostPlayerId
    },
    players: room.players
  };
}

export function toLobbySummary() {
  return [...serverState.rooms.values()].map((room) => ({
    roomId: room.id,
    roomCode: room.code,
    name: room.name,
    mode: room.mode,
    status: room.status,
    currentPlayers: room.players.length,
    maxPlayers: room.maxPlayers,
    isPrivate: room.isPrivate
  }));
}

export function canJoinRoom(room: Room) {
  return room.status === "waiting" && room.players.length < room.maxPlayers;
}

export function joinRoom(session: Session, room: Room) {
  const playerId = createId("player");
  const autoTeam = pickAutoTeam(room);
  const nextTeamSize = countTeamPlayers(room, autoTeam);

  if (nextTeamSize >= TEAM_SIZE_BY_MODE[room.mode]) {
    throw new Error("TEAM_FULL");
  }

  const player: RoomPlayer = {
    playerId,
    guestId: session.guestId,
    socketId: session.socketId,
    nickname: session.nickname,
    team: autoTeam,
    isHost: false,
    isReady: false,
    joinedAt: Date.now()
  };

  room.players.push(player);
  room.updatedAt = Date.now();
  session.currentRoomId = room.id;

  return player;
}

export function getPlayerBySocket(room: Room, socketId: string) {
  return room.players.find((player) => player.socketId === socketId) ?? null;
}

export function getPlayerById(room: Room, playerId: string) {
  return room.players.find((player) => player.playerId === playerId) ?? null;
}

export function changePlayerTeam(room: Room, socketId: string, team: Team) {
  const player = getPlayerBySocket(room, socketId);

  if (!player) {
    throw new Error("PLAYER_NOT_FOUND");
  }

  if (player.team === team) {
    return player;
  }

  if (countTeamPlayers(room, team) >= TEAM_SIZE_BY_MODE[room.mode]) {
    throw new Error("TEAM_FULL");
  }

  player.team = team;
  player.isReady = false;
  room.updatedAt = Date.now();

  return player;
}

export function setReadyState(room: Room, socketId: string, isReady: boolean) {
  const player = getPlayerBySocket(room, socketId);

  if (!player) {
    throw new Error("PLAYER_NOT_FOUND");
  }

  if (player.isHost) {
    throw new Error("HOST_READY_NOT_ALLOWED");
  }

  player.isReady = isReady;
  room.updatedAt = Date.now();

  return player;
}

function assignNextHost(room: Room, removedPlayerId: string) {
  if (removedPlayerId !== room.hostPlayerId || room.players.length === 0) {
    return;
  }

  const nextHost = [...room.players].sort((a, b) => a.joinedAt - b.joinedAt)[0];
  nextHost.isHost = true;
  room.hostPlayerId = nextHost.playerId;
}

function cleanupEmptyRoom(room: Room) {
  if (room.players.length === 0) {
    serverState.rooms.delete(room.id);
    serverState.roomCodeIndex.delete(room.code);
  }
}

export function removePlayerFromRoom(room: Room, socketId: string) {
  const index = room.players.findIndex((player) => player.socketId === socketId);

  if (index === -1) {
    return null;
  }

  const [removedPlayer] = room.players.splice(index, 1);
  room.updatedAt = Date.now();

  assignNextHost(room, removedPlayer.playerId);
  cleanupEmptyRoom(room);

  return removedPlayer;
}

export function removePlayerFromRoomById(room: Room, playerId: string) {
  const index = room.players.findIndex((player) => player.playerId === playerId);

  if (index === -1) {
    return null;
  }

  const [removedPlayer] = room.players.splice(index, 1);
  room.updatedAt = Date.now();

  assignNextHost(room, removedPlayer.playerId);
  cleanupEmptyRoom(room);

  return removedPlayer;
}

export function canStartRoom(room: Room) {
  if (room.status !== "waiting") {
    return false;
  }

  if (room.players.length !== room.maxPlayers) {
    return false;
  }

  return room.players.every((player) => player.isHost || player.isReady);
}
