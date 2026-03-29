import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@mundo/shared";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? "http://localhost:4010", {
      autoConnect: false
    });
  }

  return socket;
}
