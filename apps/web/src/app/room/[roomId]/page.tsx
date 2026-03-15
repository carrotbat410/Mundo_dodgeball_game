"use client";

import type { RoomPlayer, RoomState } from "@mundo/shared";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../../lib/socket/client";
import { clearCurrentRoomId, getCurrentRoomId } from "../../../lib/room/currentRoom";
import { getGuestSession } from "../../../lib/session/guestSession";

interface ChatEntry {
  id: string;
  tone: "user" | "system";
  text: string;
  sender?: string;
}

function PlayerCard({
  player,
  meId,
  isHost,
  onKick
}: {
  player: RoomPlayer;
  meId: string | null;
  isHost: boolean;
  onKick: (playerId: string, nickname: string) => void;
}) {
  const isMe = player.playerId === meId;

  return (
    <div className="panel" style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div>
        <strong>{player.nickname}</strong>
        <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
          {player.isHost ? "방장" : "참가자"} · {player.isReady ? "준비 완료" : "준비 전"}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isMe ? <span style={{ color: "var(--accent)" }}>나</span> : null}
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
            강퇴
          </button>
        ) : null}
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

  useEffect(() => {
    const session = getGuestSession();
    const currentRoomId = getCurrentRoomId();

    if (!session || !roomId || (currentRoomId && currentRoomId !== roomId)) {
      router.replace("/rooms");
      return;
    }

    const socket = getSocket();

    const handleRoomState = (payload: RoomState) => {
      setRoomState(payload);
      setError("");
    };

    const handleSystemMessage = (payload: { type: string; message: string }) => {
      setChatEntries((current) => [...current, { id: `${payload.type}-${Date.now()}`, tone: "system", text: payload.message }]);
    };

    const handleChatMessage = (payload: { senderPlayerId: string; nickname: string; message: string; sentAt: number }) => {
      setChatEntries((current) => [...current, { id: `${payload.senderPlayerId}-${payload.sentAt}`, tone: "user", text: payload.message, sender: payload.nickname }]);
    };

    const handleKicked = (payload: { message: string }) => {
      clearCurrentRoomId();
      window.alert(payload.message);
      router.replace("/rooms");
    };

    const handleError = (payload: { message: string }) => {
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
      router.push(`/game/${roomState.room.roomId}`);
    }
  }, [roomState, router]);

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
    getSocket().emit("room:leave");
    clearCurrentRoomId();
    router.push("/rooms");
  };

  const handleKick = (targetPlayerId: string, nickname: string) => {
    const shouldKick = window.confirm(`${nickname}님을 정말 강퇴할까요?`);

    if (!shouldKick) {
      return;
    }

    getSocket().emit("room:kick-player", { targetPlayerId });
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
        <section className="panel" style={{ padding: 24 }}>방 상태를 불러오는 중입니다...</section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel" style={{ padding: 24, display: "grid", gap: 20 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, color: "var(--accent)", fontWeight: 700 }}>Room</p>
            <h1 style={{ margin: "8px 0 0", fontSize: 32 }}>{roomState.room.name}</h1>
          </div>
          <div style={{ color: "var(--muted)" }}>
            {roomState.room.mode} · 코드 {roomState.room.roomCode}
          </div>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 20 }}>
          <section style={{ display: "grid", gap: 16 }}>
            <button type="button" className="panel" onClick={() => handleTeamChange("blue")} style={{ padding: 16, background: "rgba(71,184,255,0.12)", border: 0, color: "var(--text)", textAlign: "left", cursor: "pointer" }}>
              <strong>블루팀 ({bluePlayers.length}명)</strong>
              <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>이 바를 클릭하면 블루팀으로 이동합니다.</p>
            </button>
            {bluePlayers.map((player) => (
              <PlayerCard key={player.playerId} player={player} meId={me?.playerId ?? null} isHost={Boolean(me?.isHost)} onKick={handleKick} />
            ))}
            <button type="button" className="panel" onClick={() => handleTeamChange("red")} style={{ padding: 16, background: "rgba(255,109,94,0.12)", border: 0, color: "var(--text)", textAlign: "left", cursor: "pointer" }}>
              <strong>레드팀 ({redPlayers.length}명)</strong>
              <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>이 바를 클릭하면 레드팀으로 이동합니다.</p>
            </button>
            {redPlayers.map((player) => (
              <PlayerCard key={player.playerId} player={player} meId={me?.playerId ?? null} isHost={Boolean(me?.isHost)} onKick={handleKick} />
            ))}
          </section>
          <aside className="panel" style={{ padding: 18, display: "grid", gap: 14 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>채팅</h2>
            <div style={{ minHeight: 220, maxHeight: 300, overflowY: "auto", color: "var(--muted)", lineHeight: 1.7, display: "grid", gap: 8 }}>
              {chatEntries.length === 0 ? <span>아직 메시지가 없습니다.</span> : null}
              {chatEntries.map((entry) => (
                <div key={entry.id} style={{ color: entry.tone === "system" ? "var(--muted)" : "var(--text)" }}>
                  {entry.sender ? <strong>{entry.sender}: </strong> : null}
                  {entry.text}
                </div>
              ))}
            </div>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSendChat();
                }
              }}
              placeholder="메시지 입력"
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text)"
              }}
            />
            <button type="button" onClick={handleSendChat} style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: "rgba(255,255,255,0.12)", color: "var(--text)", cursor: "pointer" }}>
              전송
            </button>
          </aside>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)" }}>
            {error || "정원 충족 + 방장 제외 전원 준비 완료 시 방장이 시작할 수 있습니다."}
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {me?.isHost ? (
              <button type="button" onClick={() => getSocket().emit("room:start-game")} disabled={!canStart} style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: canStart ? "var(--accent)" : "rgba(255,255,255,0.12)", color: canStart ? "#07111b" : "var(--muted)", fontWeight: 700, cursor: canStart ? "pointer" : "not-allowed" }}>
                게임 시작
              </button>
            ) : (
              <button type="button" onClick={handleReadyToggle} style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: me?.isReady ? "rgba(185,255,102,0.16)" : "rgba(255,255,255,0.12)", color: "var(--text)", fontWeight: 700, cursor: "pointer" }}>
                {me?.isReady ? "준비 취소" : "준비"}
              </button>
            )}
            <button type="button" onClick={handleLeave} style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "var(--text)", cursor: "pointer" }}>
              나가기
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
