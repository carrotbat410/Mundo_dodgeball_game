import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@mundo/shared";
import { env } from "./config/env";
import { startGameLoop } from "./engine/gameLoop";
import { registerSocketHandlers } from "./socket/registerSocketHandlers";

export function createGameServer() {
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: env.clientOrigin,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    registerSocketHandlers(io, socket);
  });

  startGameLoop(io);

  return { httpServer, io };
}
