import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@mundo/shared";
import { registerGuestHandler } from "./handlers/guestHandler.js";
import { registerLobbyHandler } from "./handlers/lobbyHandler.js";
import { handleRoomDisconnect, registerRoomHandler } from "./handlers/roomHandler.js";
import { registerGameHandler } from "./handlers/gameHandler.js";
import { serverState } from "../state/serverState.js";

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: GameIo, socket: GameSocket) {
  registerGuestHandler(socket);
  registerLobbyHandler(io, socket);
  registerRoomHandler(io, socket);
  registerGameHandler(io, socket);

  socket.on("disconnect", () => {
    handleRoomDisconnect(io, socket.id);
    serverState.sessions.delete(socket.id);
  });
}
