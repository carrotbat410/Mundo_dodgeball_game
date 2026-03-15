import {
  COUNTDOWN_SEC,
  MAP_CENTER_X,
  MAP_CENTER_Y,
  MAP_RADIUS,
  MATCH_DURATION_SEC,
  MODE_MAX_PLAYERS,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  type GameMode,
  type GameStateSnapshot,
  type RoomPlayer,
  type Team
} from "@mundo/shared";
import { serverState } from "../state/serverState";
import type { Game, GamePlayer, Room } from "../types/state";

const ARENA_RADIUS = MAP_RADIUS - PLAYER_RADIUS;
const BLUE_SPAWNS: Record<GameMode, readonly { x: number; y: number }[]> = {
  "1v1": [{ x: MAP_CENTER_X - 140, y: MAP_CENTER_Y }],
  "2v2": [
    { x: MAP_CENTER_X - 150, y: MAP_CENTER_Y - 78 },
    { x: MAP_CENTER_X - 150, y: MAP_CENTER_Y + 78 }
  ],
  "3v3": [
    { x: MAP_CENTER_X - 170, y: MAP_CENTER_Y - 96 },
    { x: MAP_CENTER_X - 130, y: MAP_CENTER_Y },
    { x: MAP_CENTER_X - 170, y: MAP_CENTER_Y + 96 }
  ]
};
const RED_SPAWNS: Record<GameMode, readonly { x: number; y: number }[]> = {
  "1v1": [{ x: MAP_CENTER_X + 140, y: MAP_CENTER_Y }],
  "2v2": [
    { x: MAP_CENTER_X + 150, y: MAP_CENTER_Y - 78 },
    { x: MAP_CENTER_X + 150, y: MAP_CENTER_Y + 78 }
  ],
  "3v3": [
    { x: MAP_CENTER_X + 170, y: MAP_CENTER_Y - 96 },
    { x: MAP_CENTER_X + 130, y: MAP_CENTER_Y },
    { x: MAP_CENTER_X + 170, y: MAP_CENTER_Y + 96 }
  ]
};

function sortTeamPlayers(players: RoomPlayer[]) {
  return [...players].sort((a, b) => a.joinedAt - b.joinedAt);
}

function createGamePlayer(roomPlayer: RoomPlayer, x: number, y: number): GamePlayer {
  return {
    playerId: roomPlayer.playerId,
    guestId: roomPlayer.guestId,
    socketId: roomPlayer.socketId,
    nickname: roomPlayer.nickname,
    team: roomPlayer.team,
    x,
    y,
    hp: 4,
    alive: true,
    moveTargetX: x,
    moveTargetY: y
  };
}

function clampPointToTeamArena(team: Team, x: number, y: number) {
  let dx = x - MAP_CENTER_X;
  const minDx = team === "blue" ? -ARENA_RADIUS : PLAYER_RADIUS;
  const maxDx = team === "blue" ? -PLAYER_RADIUS : ARENA_RADIUS;

  dx = Math.max(minDx, Math.min(maxDx, dx));

  const maxDy = Math.sqrt(Math.max(0, ARENA_RADIUS ** 2 - dx ** 2));
  const dy = Math.max(-maxDy, Math.min(maxDy, y - MAP_CENTER_Y));

  return {
    x: MAP_CENTER_X + dx,
    y: MAP_CENTER_Y + dy
  };
}

function buildSpawnedPlayers(room: Room) {
  const bluePlayers = sortTeamPlayers(room.players.filter((player) => player.team === "blue"));
  const redPlayers = sortTeamPlayers(room.players.filter((player) => player.team === "red"));
  const spawnedPlayers: GamePlayer[] = [];

  bluePlayers.forEach((player, index) => {
    const spawn = BLUE_SPAWNS[room.mode][index] ?? BLUE_SPAWNS[room.mode][BLUE_SPAWNS[room.mode].length - 1];
    spawnedPlayers.push(createGamePlayer(player, spawn.x, spawn.y));
  });

  redPlayers.forEach((player, index) => {
    const spawn = RED_SPAWNS[room.mode][index] ?? RED_SPAWNS[room.mode][RED_SPAWNS[room.mode].length - 1];
    spawnedPlayers.push(createGamePlayer(player, spawn.x, spawn.y));
  });

  return spawnedPlayers;
}

export function createGameForRoom(room: Room) {
  const game: Game = {
    roomId: room.id,
    mode: room.mode,
    status: "countdown",
    countdownRemaining: COUNTDOWN_SEC,
    remainingTime: MATCH_DURATION_SEC,
    players: buildSpawnedPlayers(room)
  };

  serverState.games.set(room.id, game);
  return game;
}

export function getGameByRoomId(roomId: string) {
  return serverState.games.get(roomId) ?? null;
}

export function removeGameByRoomId(roomId: string) {
  serverState.games.delete(roomId);
}

export function syncGamePlayersForRoom(room: Room) {
  const game = serverState.games.get(room.id);

  if (!game) {
    return;
  }

  game.players = game.players.filter((player) => room.players.some((roomPlayer) => roomPlayer.playerId === player.playerId));
}

export function setMoveTarget(roomId: string, socketId: string, targetX: number, targetY: number) {
  const game = serverState.games.get(roomId);

  if (!game || game.status !== "playing") {
    throw new Error("GAME_NOT_READY");
  }

  const player = game.players.find((entry) => entry.socketId === socketId);

  if (!player) {
    throw new Error("PLAYER_NOT_FOUND");
  }

  if (!player.alive) {
    throw new Error("PLAYER_NOT_ALIVE");
  }

  const nextTarget = clampPointToTeamArena(player.team, targetX, targetY);
  player.moveTargetX = nextTarget.x;
  player.moveTargetY = nextTarget.y;
}

export function advanceGames(deltaSec: number) {
  const transitionedRoomIds: string[] = [];

  for (const game of serverState.games.values()) {
    if (game.status === "countdown") {
      game.countdownRemaining = Math.max(0, game.countdownRemaining - deltaSec);

      if (game.countdownRemaining === 0) {
        game.status = "playing";
        const room = serverState.rooms.get(game.roomId);

        if (room) {
          room.status = "playing";
          room.updatedAt = Date.now();
          transitionedRoomIds.push(room.id);
        }
      }

      continue;
    }

    if (game.status !== "playing") {
      continue;
    }

    game.remainingTime = Math.max(0, game.remainingTime - deltaSec);

    for (const player of game.players) {
      if (!player.alive || player.moveTargetX == null || player.moveTargetY == null) {
        continue;
      }

      const dx = player.moveTargetX - player.x;
      const dy = player.moveTargetY - player.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 1) {
        player.x = player.moveTargetX;
        player.y = player.moveTargetY;
        continue;
      }

      const moveDistance = PLAYER_MOVE_SPEED * deltaSec;

      if (moveDistance >= distance) {
        player.x = player.moveTargetX;
        player.y = player.moveTargetY;
        continue;
      }

      player.x += (dx / distance) * moveDistance;
      player.y += (dy / distance) * moveDistance;
    }
  }

  return transitionedRoomIds;
}

export function toGameStateSnapshot(game: Game): GameStateSnapshot {
  return {
    roomId: game.roomId,
    mode: game.mode,
    status: game.status,
    countdownRemaining: game.countdownRemaining,
    remainingTime: game.remainingTime,
    players: game.players.map((player) => ({
      playerId: player.playerId,
      nickname: player.nickname,
      team: player.team,
      x: player.x,
      y: player.y,
      hp: player.hp,
      alive: player.alive
    }))
  };
}

export function getRoomExpectedPlayers(mode: GameMode) {
  return MODE_MAX_PLAYERS[mode];
}
