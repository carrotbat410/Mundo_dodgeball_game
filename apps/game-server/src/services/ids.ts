export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
