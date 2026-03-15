import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@mundo/shared";
import { toLobbySummary } from "../../services/roomService";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;

export function emitLobbyList(io: GameIo) {
  io.emit("lobby:list-updated", {
    rooms: toLobbySummary()
  });
}

export function registerLobbyHandler(io: GameIo, socket: GameSocket) {
  socket.on("lobby:list", () => {
    emitLobbyList(io);
  });
}
