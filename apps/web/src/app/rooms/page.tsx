"use client";

import { GAME_MODES, MAX_ROOM_NAME_LENGTH, MAX_ROOM_PASSWORD_LENGTH, MIN_ROOM_PASSWORD_LENGTH, type GameMode, type RoomSummary } from "@mundo/shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { detectLocale, t, tf } from "../../lib/i18n/messages";
import { getSocket } from "../../lib/socket/client";
import { getGuestSession } from "../../lib/session/guestSession";
import { saveCurrentRoomId } from "../../lib/room/currentRoom";

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<GameMode>("1v1");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const locale = useMemo(() => detectLocale(), []);

  useEffect(() => {
    const session = getGuestSession();

    if (!session) {
      window.alert(t(locale, "rooms.sessionExpired"));
      router.replace("/guest");
      return;
    }

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    const handleListUpdated = (payload: { rooms: RoomSummary[] }) => {
      setRooms(payload.rooms);
    };

    const handleJoined = (payload: { room: { roomId: string } }) => {
      saveCurrentRoomId(payload.room.roomId);
      router.push(`/room/${payload.room.roomId}`);
    };

    const handleError = (payload: { code: string; message: string }) => {
      setError(payload.message);

      if (payload.code === "SESSION_NOT_FOUND" || payload.code === "UNAUTHORIZED") {
        window.alert(t(locale, "rooms.sessionExpired"));
        router.replace("/guest");
        return;
      }

      if (payload.code === "PASSWORD_REQUIRED") {
        const input = window.prompt(t(locale, "rooms.promptPassword"));
        const normalizedPassword = input?.trim();

        if (!normalizedPassword) {
          return;
        }

        getSocket().emit("lobby:join-by-code", {
          roomCode,
          password: normalizedPassword
        });
      }
    };

    socket.on("lobby:list-updated", handleListUpdated);
    socket.on("room:joined", handleJoined);
    socket.on("system:error", handleError);
    socket.emit("lobby:list");

    return () => {
      socket.off("lobby:list-updated", handleListUpdated);
      socket.off("room:joined", handleJoined);
      socket.off("system:error", handleError);
    };
  }, [locale, roomCode, router]);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "waiting" ? -1 : 1;
      }

      return b.currentPlayers - a.currentPlayers;
    });
  }, [rooms]);

  const handleCreateRoom = () => {
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length > MAX_ROOM_NAME_LENGTH) {
      setError(tf(locale, "rooms.errorRoomName", { max: MAX_ROOM_NAME_LENGTH }));
      return;
    }

    if (isPrivate && (password.length < MIN_ROOM_PASSWORD_LENGTH || password.length > MAX_ROOM_PASSWORD_LENGTH)) {
      setError(tf(locale, "rooms.errorPasswordLength", { min: MIN_ROOM_PASSWORD_LENGTH, max: MAX_ROOM_PASSWORD_LENGTH }));
      return;
    }

    setError("");
    getSocket().emit("room:create", {
      name: trimmedName,
      mode,
      isPrivate,
      password: isPrivate ? password : undefined
    });
  };

  const handleJoinRoom = (room: RoomSummary) => {
    setError("");

    if (room.status !== "waiting") {
      setError(t(locale, "rooms.errorPlaying"));
      return;
    }

    if (room.isPrivate) {
      const input = window.prompt(t(locale, "rooms.promptPassword"));

      if (!input) {
        return;
      }

      getSocket().emit("room:join-private", { roomId: room.roomId, password: input });
      return;
    }

    getSocket().emit("room:join", { roomId: room.roomId });
  };

  const handleJoinByCode = () => {
    const normalized = roomCode.trim().toUpperCase();

    if (!normalized) {
      setError(t(locale, "rooms.errorCodeRequired"));
      return;
    }

    const listedRoom = rooms.find((room) => room.roomCode === normalized);

    if (listedRoom?.status === "playing") {
      setError(t(locale, "rooms.errorPlaying"));
      return;
    }

    if (listedRoom?.isPrivate) {
      const input = window.prompt(t(locale, "rooms.promptPassword"));

      if (!input) {
        return;
      }

      getSocket().emit("lobby:join-by-code", { roomCode: normalized, password: input });
      return;
    }

    setError("");
    getSocket().emit("lobby:join-by-code", { roomCode: normalized });
  };

  return (
    <main className="page-shell" style={{ display: "grid", gap: 18 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, color: "var(--accent)", fontWeight: 700 }}>Lobby</p>
          <h1 style={{ margin: "8px 0 0", fontSize: 34 }}>{t(locale, "rooms.title")}</h1>
        </div>
        <button
          type="button"
          className="panel"
          onClick={() => setIsCreateOpen((value) => !value)}
          style={{
            padding: "12px 18px",
            border: 0,
            background: "linear-gradient(135deg, var(--red), #ff9d56)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          {isCreateOpen ? t(locale, "rooms.close") : t(locale, "rooms.create")}
        </button>
      </header>

      {isCreateOpen ? (
        <section
          className="panel"
          style={{
            maxWidth: 720,
            width: "100%",
            margin: "0 auto",
            padding: 24,
            display: "grid",
            gap: 14
          }}
        >
          <h2 style={{ margin: 0 }}>{t(locale, "rooms.createTitle")}</h2>
          <input
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, MAX_ROOM_NAME_LENGTH))}
            placeholder={t(locale, "rooms.roomNamePlaceholder")}
            style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--text)" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {GAME_MODES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                style={{
                  width: 72,
                  height: 72,
                  flex: "0 0 72px",
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 12,
                  border: item === mode ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
                  background: item === mode ? "rgba(71,184,255,0.18)" : "transparent",
                  color: "var(--text)",
                  fontWeight: 700
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
            {t(locale, "rooms.privateToggle")}
          </label>
          {isPrivate ? (
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value.slice(0, MAX_ROOM_PASSWORD_LENGTH))}
              placeholder={t(locale, "rooms.passwordPlaceholder")}
              style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--text)" }}
            />
          ) : null}
          <button
            type="button"
            onClick={handleCreateRoom}
            style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: "var(--blue)", color: "#04131d", fontWeight: 700, cursor: "pointer" }}
          >
            {t(locale, "rooms.createSubmit")}
          </button>
          <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)", lineHeight: 1.6 }}>
            {error || t(locale, "rooms.playingHint")}
          </p>
        </section>
      ) : null}

      {!isCreateOpen ? (
        <section style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 20, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            {sortedRooms.map((room) => (
              <article
                key={room.roomId}
                className="panel"
                style={{ padding: "14px 16px", display: "grid", gap: 8 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <strong style={{ fontSize: 18, lineHeight: 1.25 }}>{room.name}</strong>
                  <span style={{ color: room.status === "waiting" ? "var(--accent)" : "var(--muted)" }}>
                    {room.status === "waiting" ? t(locale, "rooms.waiting") : t(locale, "rooms.playing")}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "var(--muted)", fontSize: 14 }}>
                    {room.mode} · {room.currentPlayers}/{room.maxPlayers} · {room.isPrivate ? t(locale, "rooms.private") : t(locale, "rooms.public")} · 코드 {room.roomCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleJoinRoom(room)}
                    className={room.status === "waiting" ? "room-join-button room-join-button-active" : "room-join-button"}
                  >
                    {room.status === "waiting" ? t(locale, "rooms.join") : t(locale, "rooms.joinBlocked")}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <aside className="panel" style={{ padding: 20, display: "grid", gap: 14, alignContent: "start", alignSelf: "start" }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>{t(locale, "rooms.joinByCode")}</h2>
            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder={t(locale, "rooms.codePlaceholder")}
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)"
              }}
            />
            <button
              type="button"
              onClick={handleJoinByCode}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: 0,
                background: "rgba(255,255,255,0.12)",
                color: "var(--text)",
                cursor: "pointer"
              }}
            >
              {t(locale, "rooms.joinByCode")}
            </button>
            <button
              type="button"
              onClick={() => getSocket().emit("lobby:list")}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "var(--text)",
                cursor: "pointer"
              }}
            >
              {t(locale, "rooms.refresh")}
            </button>
            <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)", lineHeight: 1.6 }}>
              {error || t(locale, "rooms.playingHint")}
            </p>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
