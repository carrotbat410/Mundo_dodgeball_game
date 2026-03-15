export interface Session {
  socketId: string;
  guestId: string;
  nickname: string;
  locale: "ko" | "en";
  currentRoomId: string | null;
  connectedAt: number;
}
