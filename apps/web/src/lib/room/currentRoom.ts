const CURRENT_ROOM_KEY = "mundo-current-room-id";

export function saveCurrentRoomId(roomId: string) {
  localStorage.setItem(CURRENT_ROOM_KEY, roomId);
}

export function getCurrentRoomId() {
  return localStorage.getItem(CURRENT_ROOM_KEY);
}

export function clearCurrentRoomId() {
  localStorage.removeItem(CURRENT_ROOM_KEY);
}
