import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@mundo/shared";
import { serverState } from "../../state/serverState";
import {
  canJoinRoom,
  canStartRoom,
  changePlayerTeam,
  createRoom,
  getPlayerById,
  getPlayerBySocket,
  joinRoom,
  removePlayerFromRoom,
  removePlayerFromRoomById,
  setReadyState,
  toRoomState
} from "../../services/roomService";
import { emitLobbyList } from "./lobbyHandler";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;

function emitRoomState(io: GameIo, roomId: string) {
  const room = serverState.rooms.get(roomId);

  if (!room) {
    return;
  }

  io.to(roomId).emit("room:state", toRoomState(room));
}

function emitError(socket: GameSocket, code: string, message: string) {
  socket.emit("system:error", { code, message });
}

export function handleRoomDisconnect(io: GameIo, socketId: string) {
  const session = serverState.sessions.get(socketId);

  if (!session?.currentRoomId) {
    return;
  }

  const room = serverState.rooms.get(session.currentRoomId);

  if (!room) {
    session.currentRoomId = null;
    return;
  }

  const removedPlayer = removePlayerFromRoom(room, socketId);

  if (!removedPlayer) {
    return;
  }

  session.currentRoomId = null;
  void io.in(room.id).socketsLeave(room.id);
  io.to(room.id).emit("room:system-message", {
    type: "player_left",
    message: `${removedPlayer.nickname}님이 방을 나갔습니다.`
  });
  emitRoomState(io, room.id);
  emitLobbyList(io);
}

export function registerRoomHandler(io: GameIo, socket: GameSocket) {
  socket.on("room:create", (payload) => {
    const session = serverState.sessions.get(socket.id);

    if (!session) {
      emitError(socket, "SESSION_NOT_FOUND", "게스트 세션을 먼저 생성해주세요.");
      return;
    }

    const room = createRoom(session, payload);
    void socket.join(room.id);
    socket.emit("room:joined", toRoomState(room));
    emitLobbyList(io);
  });

  socket.on("room:join", ({ roomId }) => {
    const session = serverState.sessions.get(socket.id);
    const room = serverState.rooms.get(roomId);

    if (!session || !room) {
      emitError(socket, "ROOM_NOT_FOUND", "방을 찾을 수 없습니다.");
      return;
    }

    if (room.isPrivate) {
      emitError(socket, "PASSWORD_REQUIRED", "비밀번호가 필요한 방입니다.");
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
    emitRoomState(io, room.id);
    emitLobbyList(io);
  });

  socket.on("room:join-private", ({ roomId, password }) => {
    const session = serverState.sessions.get(socket.id);
    const room = serverState.rooms.get(roomId);

    if (!session || !room) {
      emitError(socket, "ROOM_NOT_FOUND", "방을 찾을 수 없습니다.");
      return;
    }

    if (!room.isPrivate || room.password !== password) {
      emitError(socket, "INVALID_PASSWORD", "비밀번호가 올바르지 않습니다.");
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
    emitRoomState(io, room.id);
    emitLobbyList(io);
  });

  socket.on("room:get-state", ({ roomId }) => {
    const room = serverState.rooms.get(roomId);

    if (!room) {
      emitError(socket, "ROOM_NOT_FOUND", "방을 찾을 수 없습니다.");
      return;
    }

    if (!room.players.some((player) => player.socketId === socket.id)) {
      emitError(socket, "ROOM_ACCESS_DENIED", "현재 방에 참여 중인 플레이어만 접근할 수 있습니다.");
      return;
    }

    void socket.join(room.id);
    socket.emit("room:state", toRoomState(room));
  });

  socket.on("room:change-team", ({ team }) => {
    const session = serverState.sessions.get(socket.id);
    const room = session?.currentRoomId ? serverState.rooms.get(session.currentRoomId) : null;

    if (!room) {
      emitError(socket, "ROOM_NOT_FOUND", "방을 찾을 수 없습니다.");
      return;
    }

    try {
      const updatedPlayer = changePlayerTeam(room, socket.id, team);
      io.to(room.id).emit("room:system-message", {
        type: "team_changed",
        message: `${updatedPlayer.nickname}님이 ${team === "blue" ? "블루팀" : "레드팀"}으로 이동했습니다.`
      });
      emitRoomState(io, room.id);
      emitLobbyList(io);
    } catch (error) {
      const code = String((error as Error).message);
      emitError(socket, code, code === "TEAM_FULL" ? "해당 팀 정원이 가득 찼습니다." : "팀 이동에 실패했습니다.");
    }
  });

  socket.on("room:set-ready", ({ isReady }) => {
    const session = serverState.sessions.get(socket.id);
    const room = session?.currentRoomId ? serverState.rooms.get(session.currentRoomId) : null;

    if (!room) {
      emitError(socket, "ROOM_NOT_FOUND", "방을 찾을 수 없습니다.");
      return;
    }

    try {
      const updatedPlayer = setReadyState(room, socket.id, isReady);
      io.to(room.id).emit("room:system-message", {
        type: isReady ? "player_ready" : "player_unready",
        message: `${updatedPlayer.nickname}님이 ${isReady ? "준비 완료" : "준비 취소"}했습니다.`
      });
      emitRoomState(io, room.id);
    } catch (error) {
      const code = String((error as Error).message);
      emitError(
        socket,
        code,
        code === "HOST_READY_NOT_ALLOWED" ? "방장은 시작 버튼을 사용합니다." : "준비 상태를 변경할 수 없습니다."
      );
    }
  });

  socket.on("room:chat", ({ message }) => {
    const session = serverState.sessions.get(socket.id);

    if (!session?.currentRoomId) {
      return;
    }

    const room = serverState.rooms.get(session.currentRoomId);

    if (!room) {
      return;
    }

    const sender = getPlayerBySocket(room, socket.id);

    if (!sender || !message.trim()) {
      return;
    }

    io.to(room.id).emit("room:chat-message", {
      senderPlayerId: sender.playerId,
      nickname: sender.nickname,
      message: message.trim(),
      sentAt: Date.now()
    });
  });

  socket.on("room:leave", () => {
    handleRoomDisconnect(io, socket.id);
  });

  socket.on("room:kick-player", ({ targetPlayerId }) => {
    const session = serverState.sessions.get(socket.id);
    const room = session?.currentRoomId ? serverState.rooms.get(session.currentRoomId) : null;

    if (!room) {
      emitError(socket, "ROOM_NOT_FOUND", "방을 찾을 수 없습니다.");
      return;
    }

    const host = getPlayerBySocket(room, socket.id);

    if (!host?.isHost) {
      emitError(socket, "NOT_HOST", "방장만 강퇴할 수 있습니다.");
      return;
    }

    const targetPlayer = getPlayerById(room, targetPlayerId);

    if (!targetPlayer) {
      emitError(socket, "PLAYER_NOT_FOUND", "강퇴 대상을 찾을 수 없습니다.");
      return;
    }

    if (targetPlayer.playerId === host.playerId) {
      emitError(socket, "CANNOT_KICK_HOST", "방장은 자기 자신을 강퇴할 수 없습니다.");
      return;
    }

    const targetSession = serverState.sessions.get(targetPlayer.socketId);
    const removedPlayer = removePlayerFromRoomById(room, targetPlayerId);

    if (!removedPlayer) {
      emitError(socket, "PLAYER_NOT_FOUND", "강퇴 대상을 찾을 수 없습니다.");
      return;
    }

    if (targetSession) {
      targetSession.currentRoomId = null;
    }

    io.to(targetPlayer.socketId).emit("room:kicked", {
      roomId: room.id,
      message: "방장에 의해 강퇴되었습니다."
    });
    io.to(room.id).emit("room:system-message", {
      type: "player_kicked",
      message: `${removedPlayer.nickname}님이 방에서 강퇴되었습니다.`
    });
    emitRoomState(io, room.id);
    emitLobbyList(io);
  });

  socket.on("room:start-game", () => {
    const session = serverState.sessions.get(socket.id);
    const room = session?.currentRoomId ? serverState.rooms.get(session.currentRoomId) : null;

    if (!room) {
      emitError(socket, "ROOM_NOT_FOUND", "방을 찾을 수 없습니다.");
      return;
    }

    const player = getPlayerBySocket(room, socket.id);

    if (!player?.isHost) {
      emitError(socket, "NOT_HOST", "방장만 게임을 시작할 수 있습니다.");
      return;
    }

    if (!canStartRoom(room)) {
      emitError(socket, "NOT_READY_TO_START", "정원 충족 및 준비 상태를 먼저 확인해주세요.");
      return;
    }

    room.status = "countdown";
    emitRoomState(io, room.id);
    io.to(room.id).emit("room:system-message", {
      type: "game_starting",
      message: "게임이 곧 시작됩니다."
    });
    emitLobbyList(io);
  });
}
