"use client";

import type { GameStateSnapshot, RoomState } from "@mundo/shared";
import type { RoomGameController } from "../../../lib/phaser/createGame";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentRoomId } from "../../../lib/room/currentRoom";
import { getSocket } from "../../../lib/socket/client";
import { getGuestSession } from "../../../lib/session/guestSession";

export default function GamePage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<RoomGameController | null>(null);

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

    const handleGameState = (payload: GameStateSnapshot) => {
      setGameState(payload);
      setError("");
    };

    const handleError = (payload: { code: string; message: string }) => {
      setError(payload.message);

      if (payload.code === "ROOM_NOT_FOUND" || payload.code === "ROOM_ACCESS_DENIED") {
        router.replace("/rooms");
      }
    };

    socket.on("room:state", handleRoomState);
    socket.on("game:state", handleGameState);
    socket.on("system:error", handleError);
    socket.emit("room:get-state", { roomId });
    socket.emit("game:get-state", { roomId });

    return () => {
      socket.off("room:state", handleRoomState);
      socket.off("game:state", handleGameState);
      socket.off("system:error", handleError);
    };
  }, [roomId, router]);

  useEffect(() => {
    if (roomState?.room.status === "waiting") {
      router.replace(`/room/${roomState.room.roomId}`);
    }
  }, [roomState, router]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    let disposed = false;

    void import("../../../lib/phaser/createGame").then(({ createRoomGame }) => {
      if (disposed || !containerRef.current) {
        return;
      }

      gameRef.current = createRoomGame(containerRef.current, (targetX, targetY) => {
        getSocket().emit("game:move", { targetX, targetY });
      });

      if (gameState) {
        gameRef.current.updateSnapshot(gameState);
      }
    });

    return () => {
      disposed = true;
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [gameState]);

  useEffect(() => {
    if (!gameState || !gameRef.current) {
      return;
    }

    gameRef.current.updateSnapshot(gameState);
  }, [gameState]);

  const playerSummary = useMemo(() => {
    if (!gameState) {
      return [];
    }

    return gameState.players.map((player) => {
      const teamLabel = player.team === "blue" ? "블루팀" : "레드팀";
      return `${player.nickname} · ${teamLabel} · HP ${player.hp}`;
    });
  }, [gameState]);

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
          <h1 style={{ margin: 0, fontSize: 36 }}>카운트다운 + 이동 프리뷰 연결</h1>
          <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)", lineHeight: 1.6 }}>
            {error || "우클릭 이동 입력이 서버 권위 상태로 전장에 반영됩니다. 다음 단계는 Q 발사와 충돌입니다."}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
          <div
            className="panel"
            style={{
              minHeight: 520,
              padding: 16,
              background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))"
            }}
          >
            <div
              ref={containerRef}
              style={{
                width: "100%",
                minHeight: 488,
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                borderRadius: 18,
                background: "rgba(7,17,27,0.9)"
              }}
            />
          </div>

          <aside className="panel" style={{ padding: 20, display: "grid", gap: 14, alignContent: "start" }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>게임 상태</h2>
            <div style={{ display: "grid", gap: 8, color: "var(--muted)" }}>
              <span>방 이름: {roomState?.room.name ?? "불러오는 중"}</span>
              <span>모드: {gameState?.mode ?? roomState?.room.mode ?? "-"}</span>
              <span>방 상태: {roomState?.room.status ?? "불러오는 중"}</span>
              <span>게임 상태: {gameState?.status ?? "불러오는 중"}</span>
              <span>카운트다운: {gameState ? gameState.countdownRemaining.toFixed(1) : "-"}</span>
              <span>남은 시간: {gameState ? gameState.remainingTime.toFixed(1) : "-"}</span>
            </div>
            <h2 style={{ margin: "8px 0 0", fontSize: 22 }}>참가자</h2>
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
