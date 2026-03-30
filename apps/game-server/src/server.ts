import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@mundo/shared";
import { env } from "./config/env.js";
import { startGameLoop } from "./engine/gameLoop.js";
import { registerSocketHandlers } from "./socket/registerSocketHandlers.js";

export function createGameServer() {
  const httpServer = createServer();
  const allowedOrigins = new Set(
    env.clientOrigins.length > 0
      ? env.clientOrigins
      : [
          "http://localhost:4000",
          "http://127.0.0.1:4000",
          "http://168.107.33.123:4000",
          "http://lolcivilwarhelper.kro.kr:4000"
        ]
  );
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Not allowed by CORS: ${origin}`));
      },
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    registerSocketHandlers(io, socket);
  });

  startGameLoop(io);

  return { httpServer, io };
}
