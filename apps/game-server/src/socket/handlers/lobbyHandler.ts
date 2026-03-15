import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@mundo/shared";
import { canJoinRoom, joinRoom, toLobbySummary, toRoomState } from "../../services/roomService";
import { serverState } from "../../state/serverState";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;

function emitError(socket: GameSocket, code: string, message: string) {
  socket.emit("system:error", { code, message });
}

export function emitLobbyList(io: GameIo) {
  io.emit("lobby:list-updated", {
    rooms: toLobbySummary()
  });
}

export function registerLobbyHandler(io: GameIo, socket: GameSocket) {
  socket.on("lobby:list", () => {
    emitLobbyList(io);
  });

  socket.on("lobby:join-by-code", ({ roomCode, password }) => {
    const session = serverState.sessions.get(socket.id);
    const normalizedCode = roomCode.trim().toUpperCase();
    const roomId = serverState.roomCodeIndex.get(normalizedCode);
    const room = roomId ? serverState.rooms.get(roomId) : null;

    if (!session || !room) {
      emitError(socket, "ROOM_NOT_FOUND", "입장 가능한 방 코드를 찾지 못했습니다.");
      return;
    }

    if (room.isPrivate && room.password !== password?.trim()) {
      emitError(socket, password ? "INVALID_PASSWORD" : "PASSWORD_REQUIRED", password ? "비밀번호가 올바르지 않습니다." : "비밀번호가 필요한 방입니다.");
      return;
    }

    if (!canJoinRoom(room)) {
      emitError(socket, "ROOM_UNAVAILABLE", "현재 입장할 수 없는 방입니다.");
      return;
    }

    try {
      joinRoom(session, room);
    } catch (error) {
      const code = String((error as Error).message);
      emitError(socket, code, code === "TEAM_FULL" ? "팀 정원이 가득 찼습니다." : "방 입장에 실패했습니다.");
      return;
    }

    void socket.join(room.id);
    socket.emit("room:joined", toRoomState(room));
    io.to(room.id).emit("room:system-message", {
      type: "player_joined",
      message: `${session.nickname}님이 입장했습니다.`
    });
    io.to(room.id).emit("room:state", toRoomState(room));
    emitLobbyList(io);
  });
}
