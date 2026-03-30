import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@mundo/shared";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function resolveSocketUrl() {
  if (process.env.NEXT_PUBLIC_GAME_SERVER_URL) {
    return process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  }

  if (typeof window === "undefined") {
    return "http://localhost:4010";
  }

  const { protocol, hostname } = window.location;
  const port = hostname === "localhost" || hostname === "127.0.0.1" ? "4010" : "5000";

  return `${protocol}//${hostname}:${port}`;
}

export function getSocket() {
  if (!socket) {
    socket = io(resolveSocketUrl(), {
      autoConnect: false
    });
  }

  return socket;
}
