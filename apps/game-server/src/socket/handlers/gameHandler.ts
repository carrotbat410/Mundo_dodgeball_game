import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@mundo/shared";
import { castProjectile, getGameByRoomId, setMoveTarget, toGameStateSnapshot } from "../../services/gameService";
import { serverState } from "../../state/serverState";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;

function emitError(socket: GameSocket, code: string, message: string) {
  socket.emit("system:error", { code, message });
}

export function registerGameHandler(io: GameIo, socket: GameSocket) {
  socket.on("game:get-state", ({ roomId }) => {
    const room = serverState.rooms.get(roomId);
    const game = getGameByRoomId(roomId);

    if (!room || !game) {
      emitError(socket, "GAME_NOT_FOUND", "현재 진행 중인 게임을 찾을 수 없습니다.");
      return;
    }

    if (!room.players.some((player) => player.socketId === socket.id)) {
      emitError(socket, "ROOM_ACCESS_DENIED", "현재 방에 참여 중인 플레이어만 접근할 수 있습니다.");
      return;
    }

    void socket.join(room.id);
    socket.emit("game:state", toGameStateSnapshot(game));
  });

  socket.on("game:move", ({ targetX, targetY }) => {
    const session = serverState.sessions.get(socket.id);

    if (!session?.currentRoomId) {
      emitError(socket, "ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      setMoveTarget(session.currentRoomId, socket.id, targetX, targetY);
    } catch (error) {
      const code = String((error as Error).message);

      if (code === "GAME_NOT_READY") {
        emitError(socket, code, "게임이 아직 시작되지 않았습니다.");
        return;
      }

      if (code === "PLAYER_NOT_ALIVE") {
        emitError(socket, code, "탈락한 플레이어는 이동할 수 없습니다.");
        return;
      }

      emitError(socket, code, "이동 요청을 처리할 수 없습니다.");
    }
  });

  socket.on("game:cast-q", ({ targetX, targetY }) => {
    const session = serverState.sessions.get(socket.id);

    if (!session?.currentRoomId) {
      emitError(socket, "ROOM_NOT_FOUND", "방 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      castProjectile(session.currentRoomId, socket.id, targetX, targetY);
    } catch (error) {
      const code = String((error as Error).message);

      if (code === "GAME_NOT_READY") {
        emitError(socket, code, "게임이 아직 시작되지 않았습니다.");
        return;
      }

      if (code === "PLAYER_NOT_ALIVE") {
        emitError(socket, code, "탈락한 플레이어는 식칼을 던질 수 없습니다.");
        return;
      }

      if (code === "Q_ON_COOLDOWN") {
        emitError(socket, code, "Q가 아직 재사용 대기 중입니다.");
        return;
      }

      emitError(socket, code, "Q 사용 요청을 처리할 수 없습니다.");
    }
  });
}
