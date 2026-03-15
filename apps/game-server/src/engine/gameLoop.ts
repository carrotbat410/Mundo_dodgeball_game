import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@mundo/shared";
import { emitLobbyList } from "../socket/handlers/lobbyHandler";
import { serverState } from "../state/serverState";
import { advanceGames, toGameStateSnapshot } from "../services/gameService";
import { toRoomState } from "../services/roomService";

type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;

const TICK_RATE_MS = 50;

export function startGameLoop(io: GameIo) {
  let lastTick = Date.now();

  return setInterval(() => {
    const now = Date.now();
    const deltaSec = (now - lastTick) / 1000;
    lastTick = now;

    const transitionedRoomIds = advanceGames(deltaSec);

    for (const roomId of transitionedRoomIds) {
      const room = serverState.rooms.get(roomId);

      if (!room) {
        continue;
      }

      io.to(roomId).emit("room:state", toRoomState(room));
    }

    if (transitionedRoomIds.length > 0) {
      emitLobbyList(io);
    }

    for (const game of serverState.games.values()) {
      io.to(game.roomId).emit("game:state", toGameStateSnapshot(game));
    }
  }, TICK_RATE_MS);
}
