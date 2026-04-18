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

  const { origin, hostname } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4010";
  }

  return origin;
}

export function getSocket() {
  if (!socket) {
    socket = io(resolveSocketUrl(), {
      autoConnect: false,
      path: "/socket.io"
    });
  }

  return socket;
}
