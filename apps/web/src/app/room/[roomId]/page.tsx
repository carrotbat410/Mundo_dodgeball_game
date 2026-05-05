"use client";

import type { GameMode, RoomPlayer, RoomState } from "@mundo/shared";
import { MAX_ROOM_NAME_LENGTH, MAX_ROOM_PASSWORD_LENGTH, MIN_ROOM_PASSWORD_LENGTH } from "@mundo/shared";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { detectLocale, t, tf } from "../../../lib/i18n/messages";
import { getSocket } from "../../../lib/socket/client";
import { clearCurrentRoomId, getCurrentRoomId } from "../../../lib/room/currentRoom";
import { getGuestSession } from "../../../lib/session/guestSession";

interface ChatEntry {
  id: string;
  tone: "user" | "system";
  text: string;
  sender?: string;
}

interface RoomSettingsDraft {
  name: string;
  mode: GameMode;
  isPrivate: boolean;
  password: string;
}

function PlayerCard({
  player,
  meId,
  isHost,
  onKick,
  locale
}: {
  player: RoomPlayer;
  meId: string | null;
  isHost: boolean;
  onKick: (playerId: string, nickname: string) => void;
  locale: "ko" | "en";
}) {
  const isMe = player.playerId === meId;

  return (
    <div className="panel" style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div>
        <strong>{player.nickname}</strong>
        <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
          {player.isHost ? t(locale, "room.host") : t(locale, "room.participant")} · {player.isReady ? t(locale, "room.readyDone") : t(locale, "room.readyPending")}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isMe ? <span style={{ color: "var(--accent)" }}>{t(locale, "room.me")}</span> : null}
        {isHost && !isMe ? (
          <button
            type="button"
            onClick={() => onKick(player.playerId, player.nickname)}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              border: 0,
              background: "rgba(255,109,94,0.16)",
              color: "#ffd8d3",
              cursor: "pointer"
            }}
          >
            {t(locale, "room.kick")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RoomSettingsModal({
  draft,
  onChange,
  onClose,
  onSave,
  error,
  currentPlayers,
  locale
}: {
  draft: RoomSettingsDraft;
  onChange: (next: RoomSettingsDraft) => void;
  onClose: () => void;
  onSave: () => void;
  error: string;
  currentPlayers: number;
  locale: "ko" | "en";
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4, 7, 14, 0.72)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        zIndex: 20
      }}
    >
      <div className="panel" style={{ width: "min(100%, 520px)", padding: 24, display: "grid", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28 }}>{t(locale, "room.settingsTitle")}</h2>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>{tf(locale, "room.settingsCurrentPlayers", { count: currentPlayers })}</p>
          </div>
          <button type="button" onClick={onClose} style={{ padding: "10px 12px", borderRadius: 12, border: 0, background: "rgba(255,255,255,0.1)", color: "var(--text)", cursor: "pointer" }}>
            {t(locale, "rooms.close")}
          </button>
        </div>

        <label style={{ display: "grid", gap: 8 }}>
          <span>{t(locale, "room.roomName")}</span>
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            maxLength={MAX_ROOM_NAME_LENGTH}
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text)"
            }}
          />
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          <span>{t(locale, "room.mode")}</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["1v1", "2v2", "3v3"] as GameMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ ...draft, mode })}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: draft.mode === mode ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
                  background: draft.mode === mode ? "var(--accent)" : "rgba(255,255,255,0.04)",
                  color: draft.mode === mode ? "#07111b" : "var(--text)",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <span>{t(locale, "room.visibility")}</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => onChange({ ...draft, isPrivate: false, password: "" })}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: draft.isPrivate ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                background: draft.isPrivate ? "rgba(255,255,255,0.04)" : "var(--accent)",
                color: draft.isPrivate ? "var(--text)" : "#07111b",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {t(locale, "rooms.public")}
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...draft, isPrivate: true })}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: draft.isPrivate ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
                background: draft.isPrivate ? "var(--accent)" : "rgba(255,255,255,0.04)",
                color: draft.isPrivate ? "#07111b" : "var(--text)",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {t(locale, "rooms.private")}
            </button>
          </div>
        </div>

        {draft.isPrivate ? (
          <label style={{ display: "grid", gap: 8 }}>
            <span>{t(locale, "room.password")}</span>
            <input
              value={draft.password}
              onChange={(event) => onChange({ ...draft, password: event.target.value })}
              minLength={MIN_ROOM_PASSWORD_LENGTH}
              maxLength={MAX_ROOM_PASSWORD_LENGTH}
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)"
              }}
            />
            <span style={{ color: "var(--muted)", fontSize: 14 }}>{tf(locale, "room.passwordHint", { min: MIN_ROOM_PASSWORD_LENGTH, max: MAX_ROOM_PASSWORD_LENGTH })}</span>
          </label>
        ) : null}

        <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)" }}>
          {error || t(locale, "room.settingsHint")}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button type="button" onClick={onClose} style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: "rgba(255,255,255,0.12)", color: "var(--text)", cursor: "pointer" }}>
            {t(locale, "room.cancel")}
          </button>
          <button type="button" onClick={onSave} style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: "var(--accent)", color: "#07111b", fontWeight: 700, cursor: "pointer" }}>
            {t(locale, "room.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const isChatComposingRef = useRef(false);
  const hasLeftRoomRef = useRef(false);
  const hasShownRoomClosedAlertRef = useRef(false);
  const hasSyncedRoomRef = useRef(false);
  const isTransitioningToGameRef = useRef(false);
  const locale = useMemo(() => detectLocale(), []);
  const [settingsDraft, setSettingsDraft] = useState<RoomSettingsDraft>({
    name: "",
    mode: "1v1",
    isPrivate: false,
    password: ""
  });

  useEffect(() => {
    const session = getGuestSession();
    const currentRoomId = getCurrentRoomId();

    if (!session || !roomId || (currentRoomId && currentRoomId !== roomId)) {
      router.replace("/rooms");
      return;
    }

    const socket = getSocket();
    const closeRoomWithAlert = (message: string) => {
      if (hasShownRoomClosedAlertRef.current) {
        return;
      }

      hasShownRoomClosedAlertRef.current = true;
      hasLeftRoomRef.current = true;
      clearCurrentRoomId();
      window.alert(message);
      router.replace("/rooms");
    };

    const handleRoomState = (payload: RoomState) => {
      hasSyncedRoomRef.current = true;
      setRoomState(payload);
      setSettingsDraft((current) => ({
        name: payload.room.name,
        mode: payload.room.mode,
        isPrivate: payload.room.isPrivate,
        password: current.isPrivate === payload.room.isPrivate ? current.password : ""
      }));
      setError("");
    };

    const handleSystemMessage = (payload: { type: string; message: string }) => {
      setChatEntries((current) => [...current, { id: `${payload.type}-${Date.now()}`, tone: "system", text: payload.message }]);
    };

    const handleChatMessage = (payload: { senderPlayerId: string; nickname: string; message: string; sentAt: number }) => {
      setChatEntries((current) => [...current, { id: `${payload.senderPlayerId}-${payload.sentAt}`, tone: "user", text: payload.message, sender: payload.nickname }]);
    };

    const handleKicked = (payload: { message: string }) => {
      closeRoomWithAlert(payload.message);
    };

    const handleError = (payload: { code: string; message: string }) => {
      if (payload.code === "ROOM_NOT_FOUND" || payload.code === "ROOM_ACCESS_DENIED") {
        closeRoomWithAlert("방장이 방을 나가 방이 종료되었습니다.");
        return;
      }

      setError(payload.message);
    };

    socket.on("room:state", handleRoomState);
    socket.on("room:joined", handleRoomState);
    socket.on("room:system-message", handleSystemMessage);
    socket.on("room:chat-message", handleChatMessage);
    socket.on("room:kicked", handleKicked);
    socket.on("system:error", handleError);
    socket.emit("room:get-state", { roomId });

    return () => {
      socket.off("room:state", handleRoomState);
      socket.off("room:joined", handleRoomState);
      socket.off("room:system-message", handleSystemMessage);
      socket.off("room:chat-message", handleChatMessage);
      socket.off("room:kicked", handleKicked);
      socket.off("system:error", handleError);
    };
  }, [roomId, router]);

  useEffect(() => {
    if (roomState?.room.status === "countdown") {
      isTransitioningToGameRef.current = true;
      router.push(`/game/${roomState.room.roomId}`);
    }
  }, [roomState, router]);

  useEffect(() => {
    const leaveRoomIfNeeded = () => {
      if (hasLeftRoomRef.current || isTransitioningToGameRef.current || !hasSyncedRoomRef.current) {
        return;
      }

      const session = getGuestSession();
      const currentRoomId = getCurrentRoomId();

      if (!session || !roomId || currentRoomId !== roomId) {
        return;
      }

      hasLeftRoomRef.current = true;
      getSocket().emit("room:leave");
      clearCurrentRoomId();
    };

    const handlePageHide = () => {
      leaveRoomIfNeeded();
    };

    const handlePopState = () => {
      leaveRoomIfNeeded();
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("popstate", handlePopState);
      leaveRoomIfNeeded();
    };
  }, [roomId]);

  useEffect(() => {
    const node = chatScrollRef.current;

    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [chatEntries]);

  const socketId = getSocket().id;
  const me = useMemo(() => {
    return roomState?.players.find((player) => player.socketId === socketId) ?? null;
  }, [roomState, socketId]);

  const bluePlayers = roomState?.players.filter((player) => player.team === "blue") ?? [];
  const redPlayers = roomState?.players.filter((player) => player.team === "red") ?? [];

  const handleTeamChange = (team: "blue" | "red") => {
    getSocket().emit("room:change-team", { team });
  };

  const handleReadyToggle = () => {
    if (!me || me.isHost) {
      return;
    }

    getSocket().emit("room:set-ready", { isReady: !me.isReady });
  };

  const handleLeave = () => {
    hasLeftRoomRef.current = true;
    getSocket().emit("room:leave");
    clearCurrentRoomId();
    router.push("/rooms");
  };

  const handleKick = (targetPlayerId: string, nickname: string) => {
    const shouldKick = window.confirm(tf(locale, "room.kickConfirm", { nickname }));

    if (!shouldKick) {
      return;
    }

    getSocket().emit("room:kick-player", { targetPlayerId });
  };

  const handleOpenSettings = () => {
    if (!roomState) {
      return;
    }

    setSettingsDraft({
      name: roomState.room.name,
      mode: roomState.room.mode,
      isPrivate: roomState.room.isPrivate,
      password: ""
    });
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    getSocket().emit("room:update-settings", {
      name: settingsDraft.name,
      mode: settingsDraft.mode,
      isPrivate: settingsDraft.isPrivate,
      password: settingsDraft.isPrivate ? settingsDraft.password : undefined
    });
    setIsSettingsOpen(false);
  };

  const handleSendChat = () => {
    if (!message.trim()) {
      return;
    }

    getSocket().emit("room:chat", { message });
    setMessage("");
  };

  const canStart = useMemo(() => {
    if (!roomState || !me?.isHost) {
      return false;
    }

    const expected = { "1v1": 2, "2v2": 4, "3v3": 6 }[roomState.room.mode];

    return roomState.players.length === expected && roomState.players.every((player) => player.isHost || player.isReady);
  }, [me, roomState]);

  if (!roomState) {
    return (
      <main className="page-shell">
        <section className="panel" style={{ padding: 24 }}>{t(locale, "room.loading")}</section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      {isSettingsOpen && me?.isHost ? (
        <RoomSettingsModal
          draft={settingsDraft}
          onChange={setSettingsDraft}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          error={error}
          currentPlayers={roomState.players.length}
          locale={locale}
        />
      ) : null}
      <section className="panel" style={{ padding: 24, display: "grid", gap: 20 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, color: "var(--accent)", fontWeight: 700 }}>Room</p>
            <h1 style={{ margin: "8px 0 0", fontSize: 32 }}>{roomState.room.name}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ color: "var(--muted)" }}>
              {roomState.room.mode} · {t(locale, "room.code")} {roomState.room.roomCode} · {roomState.room.isPrivate ? t(locale, "rooms.private") : t(locale, "rooms.public")}
            </div>
            {me?.isHost ? (
              <button type="button" onClick={handleOpenSettings} style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: "rgba(255,255,255,0.12)", color: "var(--text)", cursor: "pointer" }}>
                {t(locale, "room.settings")}
              </button>
            ) : null}
          </div>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 20, alignItems: "start" }}>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, alignItems: "start" }}>
            <section className="panel" style={{ padding: 16, display: "grid", gap: 14, background: "rgba(71,184,255,0.08)" }}>
              <button type="button" onClick={() => handleTeamChange("blue")} style={{ padding: 16, background: "rgba(71,184,255,0.12)", border: 0, borderRadius: 14, color: "var(--text)", textAlign: "left", cursor: "pointer" }}>
                <strong>{t(locale, "room.blueTeam")} ({bluePlayers.length})</strong>
                <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>{t(locale, "room.teamMoveBlue")}</p>
              </button>
              {bluePlayers.map((player) => (
                <PlayerCard key={player.playerId} player={player} meId={me?.playerId ?? null} isHost={Boolean(me?.isHost)} onKick={handleKick} locale={locale} />
              ))}
            </section>
            <section className="panel" style={{ padding: 16, display: "grid", gap: 14, background: "rgba(255,109,94,0.08)" }}>
              <button type="button" onClick={() => handleTeamChange("red")} style={{ padding: 16, background: "rgba(255,109,94,0.12)", border: 0, borderRadius: 14, color: "var(--text)", textAlign: "left", cursor: "pointer" }}>
                <strong>{t(locale, "room.redTeam")} ({redPlayers.length})</strong>
                <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>{t(locale, "room.teamMoveRed")}</p>
              </button>
              {redPlayers.map((player) => (
                <PlayerCard key={player.playerId} player={player} meId={me?.playerId ?? null} isHost={Boolean(me?.isHost)} onKick={handleKick} locale={locale} />
              ))}
            </section>
          </section>
          <aside
            className="panel"
            style={{ padding: 18, display: "grid", gap: 14, alignSelf: "start", gridTemplateRows: "auto minmax(0, 300px) auto auto" }}
          >
            <h2 style={{ margin: 0, fontSize: 22 }}>{t(locale, "room.chat")}</h2>
            <div
              ref={chatScrollRef}
              style={{
                minHeight: 0,
                height: 300,
                overflowY: "auto",
                overflowX: "hidden",
                color: "var(--muted)",
                lineHeight: 1.7,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                gap: 8
              }}
            >
              {chatEntries.length === 0 ? <span>{t(locale, "room.chatEmpty")}</span> : null}
              {chatEntries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    color: entry.tone === "system" ? "var(--muted)" : "var(--text)",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word"
                  }}
                >
                  {entry.sender ? <strong>{entry.sender}: </strong> : null}
                  {entry.text}
                </div>
              ))}
            </div>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onCompositionStart={() => {
                isChatComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isChatComposingRef.current = false;
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || isChatComposingRef.current) {
                  return;
                }

                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder={t(locale, "room.messagePlaceholder")}
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)"
              }}
            />
            <button type="button" onClick={handleSendChat} style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: "rgba(255,255,255,0.12)", color: "var(--text)", cursor: "pointer" }}>
              {t(locale, "room.send")}
            </button>
          </aside>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)" }}>
            {error || t(locale, "room.startHint")}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {me?.isHost ? (
              <button type="button" onClick={() => getSocket().emit("room:start-game")} disabled={!canStart} style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: canStart ? "var(--accent)" : "rgba(255,255,255,0.12)", color: canStart ? "#07111b" : "var(--muted)", fontWeight: 700, cursor: canStart ? "pointer" : "not-allowed" }}>
                {t(locale, "room.start")}
              </button>
            ) : (
              <button type="button" onClick={handleReadyToggle} style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: me?.isReady ? "rgba(255,255,255,0.12)" : "var(--accent)", color: me?.isReady ? "var(--text)" : "#07111b", fontWeight: 700, cursor: "pointer" }}>
                {me?.isReady ? t(locale, "room.unready") : t(locale, "room.ready")}
              </button>
            )}
            <button type="button" onClick={handleLeave} style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: "rgba(255,255,255,0.12)", color: "var(--text)", cursor: "pointer" }}>
              {t(locale, "room.leave")}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
