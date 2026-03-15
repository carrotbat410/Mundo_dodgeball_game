"use client";

import type { RoomState } from "@mundo/shared";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentRoomId } from "../../../lib/room/currentRoom";
import { getSocket } from "../../../lib/socket/client";
import { getGuestSession } from "../../../lib/session/guestSession";

export default function GamePage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getGuestSession();
    const currentRoomId = getCurrentRoomId();

    if (!session || !roomId || currentRoomId !== roomId) {
      router.replace("/rooms");
      return;
    }

    const socket = getSocket();

    const handleRoomState = (payload: RoomState) => {
      setRoomState(payload);
      setError("");
    };

    const handleError = (payload: { code: string; message: string }) => {
      setError(payload.message);

      if (payload.code === "ROOM_NOT_FOUND" || payload.code === "ROOM_ACCESS_DENIED") {
        router.replace("/rooms");
      }
    };

    socket.on("room:state", handleRoomState);
    socket.on("system:error", handleError);
    socket.emit("room:get-state", { roomId });

    return () => {
      socket.off("room:state", handleRoomState);
      socket.off("system:error", handleError);
    };
  }, [roomId, router]);

  useEffect(() => {
    if (roomState?.room.status === "waiting") {
      router.replace(`/room/${roomState.room.roomId}`);
    }
  }, [roomState, router]);

  const playerSummary = useMemo(() => {
    if (!roomState) {
      return [];
    }

    return roomState.players.map((player) => `${player.nickname} · ${player.team === "blue" ? "블루팀" : "레드팀"}`);
  }, [roomState]);

  return (
    <main className="page-shell">
      <section
        className="panel"
        style={{
          minHeight: 720,
          padding: 24,
          display: "grid",
          gap: 20,
          alignContent: "start"
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0, color: "var(--accent)", fontWeight: 700 }}>Game Scene</p>
          <h1 style={{ margin: 0, fontSize: 36 }}>카운트다운/Phaser 전장 연결 예정</h1>
          <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)", lineHeight: 1.6 }}>
            {error || "스프린트 2부터 고정 맵, 카운트다운, 우클릭 이동을 여기에 붙입니다."}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
          <div
            className="panel"
            style={{
              minHeight: 520,
              display: "grid",
              placeItems: "center",
              background: "radial-gradient(circle at 50% 40%, rgba(71,184,255,0.16), rgba(7,17,27,0.4) 45%, rgba(255,255,255,0.04))"
            }}
          >
            <div style={{ textAlign: "center", display: "grid", gap: 10 }}>
              <strong style={{ fontSize: 22 }}>{roomState?.room.name ?? "게임 방"}</strong>
              <span style={{ color: "var(--muted)" }}>현재 상태: {roomState?.room.status ?? "불러오는 중"}</span>
              <span style={{ color: "var(--muted)" }}>방 ID: {roomId}</span>
            </div>
          </div>

          <aside className="panel" style={{ padding: 20, display: "grid", gap: 14, alignContent: "start" }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>참가자</h2>
            {playerSummary.length === 0 ? <p style={{ margin: 0, color: "var(--muted)" }}>참가자 정보를 불러오는 중입니다.</p> : null}
            {playerSummary.map((entry) => (
              <div key={entry} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", color: "var(--text)" }}>
                {entry}
              </div>
            ))}
            <button
              type="button"
              onClick={() => router.push(`/room/${roomId}`)}
              style={{
                marginTop: 8,
                padding: "12px 16px",
                borderRadius: 14,
                border: 0,
                background: "rgba(255,255,255,0.12)",
                color: "var(--text)",
                cursor: "pointer"
              }}
            >
              로비로 돌아가기
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
