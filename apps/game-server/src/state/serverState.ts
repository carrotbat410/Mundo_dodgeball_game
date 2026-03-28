import type { ServerState } from "../types/state.js";

export const serverState: ServerState = {
  sessions: new Map(),
  rooms: new Map(),
  roomCodeIndex: new Map(),
  games: new Map()
};
