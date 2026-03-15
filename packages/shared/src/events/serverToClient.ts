import type { RoomState, RoomSummary } from "../types/room";

export interface ServerToClientEvents {
  "guest:entered": (payload: {
    guestId: string;
    nickname: string;
    locale: "ko" | "en";
  }) => void;
  "lobby:list-updated": (payload: { rooms: RoomSummary[] }) => void;
  "room:joined": (payload: RoomState) => void;
  "room:state": (payload: RoomState) => void;
  "room:chat-message": (payload: {
    senderPlayerId: string;
    nickname: string;
    message: string;
    sentAt: number;
  }) => void;
  "room:system-message": (payload: {
    type: string;
    message: string;
  }) => void;
  "system:error": (payload: {
    code: string;
    message: string;
  }) => void;
}
