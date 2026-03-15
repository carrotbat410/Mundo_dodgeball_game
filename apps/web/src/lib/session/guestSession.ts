export interface GuestSessionData {
  guestId: string;
  nickname: string;
  locale: "ko" | "en";
}

const GUEST_SESSION_KEY = "mundo-guest-session";

export function saveGuestSession(session: GuestSessionData) {
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
}

export function getGuestSession() {
  const raw = localStorage.getItem(GUEST_SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as GuestSessionData;
  } catch {
    localStorage.removeItem(GUEST_SESSION_KEY);
    return null;
  }
}

export function clearGuestSession() {
  localStorage.removeItem(GUEST_SESSION_KEY);
}
