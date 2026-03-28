import {
  COUNTDOWN_SEC,
  MAP_CENTER_X,
  MAP_CENTER_Y,
  MAP_RADIUS,
  MATCH_DURATION_SEC,
  MODE_MAX_PLAYERS,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  PROJECTILE_RADIUS,
  PROJECTILE_SPEED,
  Q_COOLDOWN_SEC,
  type GameMode,
  type GameResult,
  type GameStateSnapshot,
  type RoomPlayer,
  type Team
} from "@mundo/shared";
import { serverState } from "../state/serverState";
import type { Game, GamePlayer, Projectile, Room } from "../types/state";
import { createId } from "./ids";

const ARENA_RADIUS = MAP_RADIUS - PLAYER_RADIUS;
const PROJECTILE_TTL_SEC = 2;
const RESULT_DELAY_SEC = 3;
const CAST_LOCK_SEC = 0.5;
const DIVIDER_NORMAL_X = Math.SQRT1_2;
const DIVIDER_NORMAL_Y = Math.SQRT1_2;
const DIVIDER_TANGENT_X = Math.SQRT1_2;
const DIVIDER_TANGENT_Y = -Math.SQRT1_2;
const BLUE_SPAWNS: Record<GameMode, readonly { x: number; y: number }[]> = {
  "1v1": [{ x: MAP_CENTER_X - 112, y: MAP_CENTER_Y - 112 }],
  "2v2": [
    { x: MAP_CENTER_X - 164, y: MAP_CENTER_Y - 54 },
    { x: MAP_CENTER_X - 54, y: MAP_CENTER_Y - 164 }
  ],
  "3v3": [
    { x: MAP_CENTER_X - 176, y: MAP_CENTER_Y - 36 },
    { x: MAP_CENTER_X - 112, y: MAP_CENTER_Y - 112 },
    { x: MAP_CENTER_X - 36, y: MAP_CENTER_Y - 176 }
  ]
};
const RED_SPAWNS: Record<GameMode, readonly { x: number; y: number }[]> = {
  "1v1": [{ x: MAP_CENTER_X + 112, y: MAP_CENTER_Y + 112 }],
  "2v2": [
    { x: MAP_CENTER_X + 54, y: MAP_CENTER_Y + 164 },
    { x: MAP_CENTER_X + 164, y: MAP_CENTER_Y + 54 }
  ],
  "3v3": [
    { x: MAP_CENTER_X + 36, y: MAP_CENTER_Y + 176 },
    { x: MAP_CENTER_X + 112, y: MAP_CENTER_Y + 112 },
    { x: MAP_CENTER_X + 176, y: MAP_CENTER_Y + 36 }
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
    facingAngle: roomPlayer.team === "blue" ? 0 : Math.PI,
    hp: 4,
    alive: true,
    qCooldownRemaining: 0,
    castLockRemaining: 0,
    moveTargetX: x,
    moveTargetY: y
  };
}

function clampPointToTeamArena(team: Team, x: number, y: number) {
  const relativeX = x - MAP_CENTER_X;
  const relativeY = y - MAP_CENTER_Y;

  let normal = relativeX * DIVIDER_NORMAL_X + relativeY * DIVIDER_NORMAL_Y;
  const tangent = relativeX * DIVIDER_TANGENT_X + relativeY * DIVIDER_TANGENT_Y;

  const minNormal = team === "blue" ? -ARENA_RADIUS : PLAYER_RADIUS;
  const maxNormal = team === "blue" ? -PLAYER_RADIUS : ARENA_RADIUS;

  normal = Math.max(minNormal, Math.min(maxNormal, normal));

  const maxTangent = Math.sqrt(Math.max(0, ARENA_RADIUS ** 2 - normal ** 2));
  const clampedTangent = Math.max(-maxTangent, Math.min(maxTangent, tangent));

  return {
    x: MAP_CENTER_X + normal * DIVIDER_NORMAL_X + clampedTangent * DIVIDER_TANGENT_X,
    y: MAP_CENTER_Y + normal * DIVIDER_NORMAL_Y + clampedTangent * DIVIDER_TANGENT_Y
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

function distancePointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const abx = bx - ax;
  const aby = by - ay;
  const abLengthSquared = abx * abx + aby * aby;

  if (abLengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / abLengthSquared));
  const closestX = ax + abx * t;
  const closestY = ay + aby * t;

  return Math.hypot(px - closestX, py - closestY);
}

function spawnProjectile(player: GamePlayer, targetX: number, targetY: number): Projectile {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 1) {
    throw new Error("INVALID_CAST_TARGET");
  }

  return {
    id: createId("projectile"),
    ownerPlayerId: player.playerId,
    team: player.team,
    x: player.x,
    y: player.y,
    prevX: player.x,
    prevY: player.y,
    dirX: dx / distance,
    dirY: dy / distance,
    speed: PROJECTILE_SPEED,
    radius: PROJECTILE_RADIUS,
    remainingLifetime: PROJECTILE_TTL_SEC
  };
}

function getAliveCounts(game: Game) {
  return {
    blue: game.players.filter((player) => player.team === "blue" && player.alive).length,
    red: game.players.filter((player) => player.team === "red" && player.alive).length
  };
}

function finishGame(room: Room, game: Game, result: GameResult) {
  if (game.status === "finished") {
    return;
  }

  game.status = "finished";
  game.result = result;
  game.resultDelayRemaining = RESULT_DELAY_SEC;
  room.updatedAt = Date.now();
}

function maybeFinishGame(room: Room, game: Game) {
  const alive = getAliveCounts(game);

  if (alive.blue === 0 && alive.red === 0) {
    finishGame(room, game, "draw");
    return;
  }

  if (alive.blue === 0) {
    finishGame(room, game, "red_win");
    return;
  }

  if (alive.red === 0) {
    finishGame(room, game, "blue_win");
  }
}

function resetRoomToLobby(room: Room) {
  room.status = "waiting";
  room.players = room.players.map((player) =>
    player.isHost
      ? player
      : {
          ...player,
          isReady: false
        }
  );
  room.updatedAt = Date.now();
}

export function createGameForRoom(room: Room) {
  const game: Game = {
    roomId: room.id,
    mode: room.mode,
    status: "countdown",
    countdownRemaining: COUNTDOWN_SEC,
    remainingTime: MATCH_DURATION_SEC,
    players: buildSpawnedPlayers(room),
    projectiles: [],
    result: null,
    resultDelayRemaining: 0
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
  maybeFinishGame(room, game);
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
  const dx = nextTarget.x - player.x;
  const dy = nextTarget.y - player.y;

  if (Math.hypot(dx, dy) > 1) {
    player.facingAngle = Math.atan2(dy, dx);
  }

  player.moveTargetX = nextTarget.x;
  player.moveTargetY = nextTarget.y;
}

export function castProjectile(roomId: string, socketId: string, targetX: number, targetY: number) {
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

  if (player.qCooldownRemaining > 0) {
    throw new Error("Q_ON_COOLDOWN");
  }

  const projectile = spawnProjectile(player, targetX, targetY);
  player.facingAngle = Math.atan2(targetY - player.y, targetX - player.x);
  player.qCooldownRemaining = Q_COOLDOWN_SEC;
  player.castLockRemaining = CAST_LOCK_SEC;
  player.moveTargetX = player.x;
  player.moveTargetY = player.y;
  game.projectiles.push(projectile);
}

export function advanceGames(deltaSec: number) {
  const transitionedRoomIds: string[] = [];
  const resetRoomIds: string[] = [];

  for (const game of serverState.games.values()) {
    const room = serverState.rooms.get(game.roomId);

    if (!room) {
      continue;
    }

    if (game.status === "countdown") {
      game.countdownRemaining = Math.max(0, game.countdownRemaining - deltaSec);

      if (game.countdownRemaining === 0) {
        game.status = "playing";
        room.status = "playing";
        room.updatedAt = Date.now();
        transitionedRoomIds.push(room.id);
      }

      continue;
    }

    if (game.status === "finished") {
      game.resultDelayRemaining = Math.max(0, game.resultDelayRemaining - deltaSec);

      if (game.resultDelayRemaining === 0) {
        resetRoomToLobby(room);
        serverState.games.delete(room.id);
        resetRoomIds.push(room.id);
      }

      continue;
    }

    game.remainingTime = Math.max(0, game.remainingTime - deltaSec);

    if (game.remainingTime === 0) {
      finishGame(room, game, "draw");
      continue;
    }

    for (const player of game.players) {
      player.qCooldownRemaining = Math.max(0, player.qCooldownRemaining - deltaSec);
      player.castLockRemaining = Math.max(0, player.castLockRemaining - deltaSec);

      if (!player.alive || player.moveTargetX == null || player.moveTargetY == null) {
        continue;
      }

      if (player.castLockRemaining > 0) {
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

      player.facingAngle = Math.atan2(dy, dx);
      player.x += (dx / distance) * moveDistance;
      player.y += (dy / distance) * moveDistance;
    }

    const remainingProjectiles: Projectile[] = [];

    for (const projectile of game.projectiles) {
      projectile.prevX = projectile.x;
      projectile.prevY = projectile.y;
      projectile.x += projectile.dirX * projectile.speed * deltaSec;
      projectile.y += projectile.dirY * projectile.speed * deltaSec;
      projectile.remainingLifetime = Math.max(0, projectile.remainingLifetime - deltaSec);

      const distanceFromCenter = Math.hypot(projectile.x - MAP_CENTER_X, projectile.y - MAP_CENTER_Y);

      if (projectile.remainingLifetime === 0 || distanceFromCenter > MAP_RADIUS) {
        continue;
      }

      let hitPlayer = false;

      for (const player of game.players) {
        if (!player.alive || player.team === projectile.team || player.playerId === projectile.ownerPlayerId) {
          continue;
        }

        const hitDistance = distancePointToSegment(
          player.x,
          player.y,
          projectile.prevX,
          projectile.prevY,
          projectile.x,
          projectile.y
        );

        if (hitDistance > PLAYER_RADIUS + projectile.radius) {
          continue;
        }

        player.hp = Math.max(0, player.hp - 1);

        if (player.hp === 0) {
          player.alive = false;
          player.moveTargetX = player.x;
          player.moveTargetY = player.y;
        }

        hitPlayer = true;
        break;
      }

      if (!hitPlayer) {
        remainingProjectiles.push(projectile);
      }
    }

    game.projectiles = remainingProjectiles;
    maybeFinishGame(room, game);
  }

  return { transitionedRoomIds, resetRoomIds };
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
      facingAngle: player.facingAngle,
      hp: player.hp,
      alive: player.alive,
      qCooldownRemaining: player.qCooldownRemaining
    })),
    projectiles: game.projectiles.map((projectile) => ({
      projectileId: projectile.id,
      ownerPlayerId: projectile.ownerPlayerId,
      team: projectile.team,
      x: projectile.x,
      y: projectile.y
    })),
    result: game.result,
    resultDelayRemaining: game.resultDelayRemaining
  };
}

export function getRoomExpectedPlayers(mode: GameMode) {
  return MODE_MAX_PLAYERS[mode];
}
