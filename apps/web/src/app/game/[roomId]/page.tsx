"use client";

import type { GameStateSnapshot, RoomPlayer, RoomState } from "@mundo/shared";
import type { RoomGameController } from "../../../lib/phaser/createGame";
import { Q_COOLDOWN_SEC } from "@mundo/shared";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { detectLocale, t, tf } from "../../../lib/i18n/messages";
import { clearCurrentRoomId, getCurrentRoomId } from "../../../lib/room/currentRoom";
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
  const hasShownRoomClosedAlertRef = useRef(false);
  const locale = useMemo(() => detectLocale(), []);

  useEffect(() => {
    const session = getGuestSession();
    const currentRoomId = getCurrentRoomId();

    if (!session || !roomId || currentRoomId !== roomId) {
      router.replace("/rooms");
      return;
    }

    const socket = getSocket();
    const closeRoomWithAlert = (message: string) => {
      if (hasShownRoomClosedAlertRef.current) {
        return;
      }

      hasShownRoomClosedAlertRef.current = true;
      clearCurrentRoomId();
      window.alert(message);
      router.replace("/rooms");
    };

    const handleRoomState = (payload: RoomState) => {
      setRoomState(payload);
      setError("");
    };

    const handleGameState = (payload: GameStateSnapshot) => {
      setGameState(payload);
      setError("");
    };

    const handleError = (payload: { code: string; message: string }) => {
      if (payload.code === "ROOM_NOT_FOUND" || payload.code === "ROOM_ACCESS_DENIED") {
        closeRoomWithAlert("방장이 방을 나가 방이 종료되었습니다.");
        return;
      }

      setError(payload.message);
    };

    const handleKicked = (payload: { message: string }) => {
      closeRoomWithAlert(payload.message);
    };

    socket.on("room:state", handleRoomState);
    socket.on("game:state", handleGameState);
    socket.on("room:kicked", handleKicked);
    socket.on("system:error", handleError);
    socket.emit("room:get-state", { roomId });
    socket.emit("game:get-state", { roomId });

    return () => {
      socket.off("room:state", handleRoomState);
      socket.off("game:state", handleGameState);
      socket.off("room:kicked", handleKicked);
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
          countdownPrefix: t(locale, "game.countdown"),
          countdownSuffix: t(locale, "game.secondsUnit")
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
  const qCooldownStroke = 2 * Math.PI * 45;
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
  const preventContextMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
  };

  return (
    <main className="page-shell" style={{ padding: 16, minHeight: "100vh", overflow: "hidden" }}>
      <section
        className="panel"
        onContextMenu={preventContextMenu}
        style={{
          height: "calc(100vh - 32px)",
          minHeight: 620,
          padding: 12,
          position: "relative",
          overflow: "hidden"
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

        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
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
            left: 28,
            top: 28,
            width: "min(420px, calc(100% - 56px))",
            padding: "14px 16px",
            borderRadius: 18,
            background: "rgba(4, 7, 14, 0.76)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "grid",
            gap: 8,
            zIndex: 4
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <p style={{ margin: 0, color: "var(--accent)", fontWeight: 700 }}>{t(locale, "game.scene")}</p>
              <h1 style={{ margin: "4px 0 0", fontSize: 24 }}>{t(locale, "game.title")}</h1>
            </div>
            <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
              {gameState ? getStatusLabel(locale, gameState.status) : t(locale, "game.loading")}
            </span>
          </div>
          <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)", lineHeight: 1.5, fontSize: 14 }}>
            {error || t(locale, "game.instructions")}
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--muted)", fontSize: 15, fontWeight: 600 }}>
            <span>{t(locale, "game.roomName")}: {roomState?.room.name ?? t(locale, "game.loading")}</span>
            <span>{t(locale, "game.mode")}: {gameState?.mode ?? roomState?.room.mode ?? "-"}</span>
            <span>{t(locale, "game.remainingTime")}: {gameState ? gameState.remainingTime.toFixed(1) : "-"}</span>
          </div>
        </div>

        <aside
          style={{
            position: "absolute",
            right: 28,
            top: 28,
            width: 300,
            maxHeight: "calc(100% - 160px)",
            padding: 14,
            borderRadius: 18,
            background: "rgba(4, 7, 14, 0.72)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "grid",
            gap: 10,
            alignContent: "start",
            overflowY: "auto",
            zIndex: 4
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>{t(locale, "game.participants")}</h2>
          {(gameState?.players ?? []).length === 0 ? <p style={{ margin: 0, color: "var(--muted)" }}>{t(locale, "game.loadingParticipants")}</p> : null}
          {(gameState?.players ?? []).map((player) => (
            <div
              key={player.playerId}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: player.team === "blue" ? "rgba(71,184,255,0.12)" : "rgba(255,109,94,0.12)",
                color: "var(--text)",
                opacity: player.alive ? 1 : 0.55,
                fontSize: 13
              }}
            >
              {player.nickname} · {player.team === "blue" ? t(locale, "game.teamBlue") : t(locale, "game.teamRed")} · HP {player.hp} · {player.alive ? t(locale, "game.alive") : t(locale, "game.eliminated")}
            </div>
          ))}
        </aside>

        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 24,
            transform: "translateX(-50%)",
            display: "grid",
            justifyItems: "center",
            gap: 8,
            zIndex: 4
          }}
        >
          <div
            style={{
              position: "relative",
              width: 92,
              height: 92,
              borderRadius: 14,
              border: "2px solid rgba(200,170,110,0.56)",
              background: "linear-gradient(180deg, rgba(22,31,42,0.96), rgba(4,7,14,0.96))",
              boxShadow: "inset 0 1px 0 rgba(255,248,234,0.18), 0 12px 28px rgba(0,0,0,0.4)",
              overflow: "hidden"
            }}
          >
            <img
              src="/sprites/cleaver.svg"
              alt=""
              style={{
                position: "absolute",
                inset: "22px 10px auto",
                width: 70,
                height: 40,
                imageRendering: "pixelated",
                filter: meGamePlayer?.qCooldownRemaining ? "grayscale(0.9) brightness(0.58)" : "drop-shadow(0 0 8px rgba(240,230,210,0.34))"
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: meGamePlayer?.qCooldownRemaining ? "rgba(2,6,12,0.48)" : "transparent"
              }}
            />
            <svg
              viewBox="0 0 100 100"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                transform: "rotate(-90deg)"
              }}
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={meGamePlayer?.qCooldownRemaining ? "rgba(185,199,218,0.92)" : "rgba(185,255,102,0.95)"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={qCooldownStroke}
                strokeDashoffset={qCooldownStroke * (1 - qProgress)}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                color: meGamePlayer?.qCooldownRemaining ? "var(--text)" : "var(--accent)",
                fontSize: meGamePlayer?.qCooldownRemaining ? 22 : 16,
                fontWeight: 800,
                textShadow: "0 2px 8px rgba(0,0,0,0.75)"
              }}
            >
              {meGamePlayer ? (meGamePlayer.qCooldownRemaining > 0 ? meGamePlayer.qCooldownRemaining.toFixed(1) : "Q") : "-"}
            </div>
            <span
              style={{
                position: "absolute",
                left: 6,
                bottom: 4,
                color: "rgba(240,230,210,0.88)",
                fontSize: 13,
                fontWeight: 800,
                textShadow: "0 1px 4px rgba(0,0,0,0.8)"
              }}
            >
              Q
            </span>
          </div>
          <strong style={{ color: meGamePlayer?.qCooldownRemaining ? "var(--muted)" : "var(--accent)", fontSize: 13 }}>
            {meGamePlayer?.qCooldownRemaining ? t(locale, "game.qSkill") : t(locale, "game.ready")}
          </strong>
        </div>
      </section>
    </main>
  );
}
