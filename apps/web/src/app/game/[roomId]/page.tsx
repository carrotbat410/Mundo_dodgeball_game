"use client";

import type { GameStateSnapshot, RoomPlayer, RoomState } from "@mundo/shared";
import type { RoomGameController } from "../../../lib/phaser/createGame";
import { Q_COOLDOWN_SEC } from "@mundo/shared";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { detectLocale, t, tf } from "../../../lib/i18n/messages";
import { getCurrentRoomId } from "../../../lib/room/currentRoom";
import { getSocket } from "../../../lib/socket/client";
import { getGuestSession } from "../../../lib/session/guestSession";

function getResultLabel(
  result: GameStateSnapshot["result"],
  myTeam: RoomPlayer["team"] | null
) {
  if (!result) {
    return null;
  }

  if (result === "draw") {
    return "무승부";
  }

  if (!myTeam) {
    return result === "blue_win" ? "blue_win" : "red_win";
  }

  const myWin = (result === "blue_win" && myTeam === "blue") || (result === "red_win" && myTeam === "red");
  return myWin ? "승리" : "패배";
}

function getStatusLabel(locale: "ko" | "en", status: RoomState["room"]["status"] | GameStateSnapshot["status"]) {
  switch (status) {
    case "waiting":
      return t(locale, "game.status.waiting");
    case "countdown":
      return t(locale, "game.status.countdown");
    case "playing":
      return t(locale, "game.status.playing");
    case "finished":
      return t(locale, "game.status.finished");
    default:
      return status;
  }
}

export default function GamePage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<RoomGameController | null>(null);
  const locale = useMemo(() => detectLocale(), []);

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

      gameRef.current = createRoomGame(
        containerRef.current,
        (targetX, targetY) => {
          getSocket().emit("game:move", { targetX, targetY });
        },
        (targetX, targetY) => {
          getSocket().emit("game:cast-q", { targetX, targetY });
        },
        {
          title: t(locale, "game.title"),
          waiting: t(locale, "game.loading"),
          countdownPrefix: t(locale, "game.countdown"),
          countdownSuffix: t(locale, "game.secondsUnit"),
          statusPrefix: t(locale, "game.gameStatus"),
          remainingTimePrefix: t(locale, "game.remainingTime"),
          controlsHint: t(locale, "game.controlsShort")
        }
      );

      if (gameState) {
        gameRef.current.updateSnapshot(gameState);
      }
    });

    return () => {
      disposed = true;
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!gameState || !gameRef.current) {
      return;
    }

    gameRef.current.updateSnapshot(gameState);
  }, [gameState]);

  const socketId = getSocket().id;
  const meRoomPlayer = useMemo(() => {
    return roomState?.players.find((player) => player.socketId === socketId) ?? null;
  }, [roomState, socketId]);

  const meGamePlayer = useMemo(() => {
    if (!gameState || !meRoomPlayer) {
      return null;
    }

    return gameState.players.find((player) => player.playerId === meRoomPlayer.playerId) ?? null;
  }, [gameState, meRoomPlayer]);

  const qProgress = meGamePlayer ? Math.max(0, Math.min(1, 1 - meGamePlayer.qCooldownRemaining / Q_COOLDOWN_SEC)) : 0;
  const resultLabel = getResultLabel(gameState?.result ?? null, meRoomPlayer?.team ?? null);
  const localizedResultLabel =
    resultLabel === "무승부"
      ? t(locale, "game.result.draw")
      : resultLabel === "승리"
        ? t(locale, "game.result.win")
        : resultLabel === "패배"
          ? t(locale, "game.result.lose")
          : resultLabel === "blue_win"
            ? t(locale, "game.teamBlue")
            : resultLabel === "red_win"
              ? t(locale, "game.teamRed")
              : resultLabel;

  return (
    <main className="page-shell">
      <section
        className="panel"
        style={{
          minHeight: 720,
          padding: 24,
          display: "grid",
          gap: 20,
          alignContent: "start",
          position: "relative"
        }}
      >
        {gameState?.status === "finished" && localizedResultLabel ? (
          <div
            style={{
              position: "absolute",
              inset: 24,
              display: "grid",
              placeItems: "center",
              background: "rgba(4, 7, 14, 0.56)",
              borderRadius: 24,
              zIndex: 10
            }}
          >
            <div style={{ textAlign: "center", display: "grid", gap: 10 }}>
              <strong style={{ fontSize: 48, color: "var(--text)" }}>{localizedResultLabel}</strong>
              <span style={{ color: "var(--muted)", fontSize: 18 }}>
                {tf(locale, "game.returnToLobbySoon", { seconds: gameState.resultDelayRemaining.toFixed(1) })}
              </span>
            </div>
          </div>
        ) : null}

        {gameState?.status === "playing" && meGamePlayer && !meGamePlayer.alive ? (
          <div
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              top: 110,
              display: "grid",
              placeItems: "center",
              zIndex: 6,
              pointerEvents: "none"
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                borderRadius: 16,
                background: "rgba(4, 7, 14, 0.72)",
                color: "#ffd5ca",
                border: "1px solid rgba(255,255,255,0.08)",
                fontWeight: 700
              }}
            >
              {t(locale, "game.spectating")}
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0, color: "var(--accent)", fontWeight: 700 }}>{t(locale, "game.scene")}</p>
          <h1 style={{ margin: 0, fontSize: 36 }}>{t(locale, "game.title")}</h1>
          <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)", lineHeight: 1.6 }}>
            {error || t(locale, "game.instructions")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
          <div
            className="panel"
            style={{
              minHeight: 520,
              padding: 16,
              background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
              position: "relative"
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
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: 28,
                transform: "translateX(-50%)",
                width: 280,
                padding: "14px 18px",
                borderRadius: 18,
                background: "rgba(4, 7, 14, 0.82)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "grid",
                gap: 10
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{t(locale, "game.qSkill")}</strong>
                <span style={{ color: meGamePlayer?.qCooldownRemaining ? "var(--muted)" : "var(--accent)", fontWeight: 700 }}>
                  {meGamePlayer ? (meGamePlayer.qCooldownRemaining > 0 ? `${meGamePlayer.qCooldownRemaining.toFixed(1)}s` : t(locale, "game.ready")) : "-"}
                </span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${qProgress * 100}%`,
                    height: "100%",
                    background: meGamePlayer?.qCooldownRemaining ? "linear-gradient(90deg, #6f7f96, #b8c7da)" : "linear-gradient(90deg, #b9ff66, #dbff8b)"
                  }}
                />
              </div>
            </div>
          </div>

          <aside className="panel" style={{ padding: 20, display: "grid", gap: 14, alignContent: "start" }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>{t(locale, "game.sidebar")}</h2>
            <div style={{ display: "grid", gap: 8, color: "var(--muted)" }}>
              <span>{t(locale, "game.roomName")}: {roomState?.room.name ?? t(locale, "game.loading")}</span>
              <span>{t(locale, "game.mode")}: {gameState?.mode ?? roomState?.room.mode ?? "-"}</span>
              <span>{t(locale, "game.roomStatus")}: {roomState ? getStatusLabel(locale, roomState.room.status) : t(locale, "game.loading")}</span>
              <span>{t(locale, "game.gameStatus")}: {gameState ? getStatusLabel(locale, gameState.status) : t(locale, "game.loading")}</span>
              <span>{t(locale, "game.countdown")}: {gameState ? gameState.countdownRemaining.toFixed(1) : "-"}</span>
              <span>{t(locale, "game.remainingTime")}: {gameState ? gameState.remainingTime.toFixed(1) : "-"}</span>
              <span>{t(locale, "game.projectileCount")}: {gameState?.projectiles.length ?? 0}</span>
            </div>
            <h2 style={{ margin: "8px 0 0", fontSize: 22 }}>{t(locale, "game.participants")}</h2>
            {(gameState?.players ?? []).length === 0 ? <p style={{ margin: 0, color: "var(--muted)" }}>{t(locale, "game.loadingParticipants")}</p> : null}
            {(gameState?.players ?? []).map((player) => (
              <div key={player.playerId} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", color: "var(--text)", opacity: player.alive ? 1 : 0.55 }}>
                {player.nickname} · {player.team === "blue" ? t(locale, "game.teamBlue") : t(locale, "game.teamRed")} · HP {player.hp} · {player.alive ? t(locale, "game.alive") : t(locale, "game.eliminated")}
              </div>
            ))}
          </aside>
        </div>
      </section>
    </main>
  );
}
