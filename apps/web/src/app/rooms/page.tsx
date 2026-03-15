"use client";

import { GAME_MODES, MAX_ROOM_NAME_LENGTH, MAX_ROOM_PASSWORD_LENGTH, MIN_ROOM_PASSWORD_LENGTH, type GameMode, type RoomSummary } from "@mundo/shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../lib/socket/client";
import { getGuestSession } from "../../lib/session/guestSession";
import { saveCurrentRoomId } from "../../lib/room/currentRoom";

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<GameMode>("2v2");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [roomCode, setRoomCode] = useState("");

  useEffect(() => {
    const session = getGuestSession();

    if (!session) {
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

      if (payload.code === "PASSWORD_REQUIRED") {
        const input = window.prompt("비밀번호를 입력해주세요.");
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
  }, [roomCode, router]);

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
      setError(`방 이름은 1자 이상 ${MAX_ROOM_NAME_LENGTH}자 이하로 입력해주세요.`);
      return;
    }

    if (isPrivate && (password.length < MIN_ROOM_PASSWORD_LENGTH || password.length > MAX_ROOM_PASSWORD_LENGTH)) {
      setError(`비밀번호는 ${MIN_ROOM_PASSWORD_LENGTH}자 이상 ${MAX_ROOM_PASSWORD_LENGTH}자 이하로 입력해주세요.`);
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
      setError("게임중 방은 입장할 수 없습니다.");
      return;
    }

    if (room.isPrivate) {
      const input = window.prompt("비밀번호를 입력해주세요.");

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
      setError("방 코드를 입력해주세요.");
      return;
    }

    const listedRoom = rooms.find((room) => room.roomCode === normalized);

    if (listedRoom?.status === "playing") {
      setError("게임중 방은 입장할 수 없습니다.");
      return;
    }

    if (listedRoom?.isPrivate) {
      const input = window.prompt("비밀번호를 입력해주세요.");

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
          <h1 style={{ margin: "8px 0 0", fontSize: 34 }}>방 목록</h1>
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
          {isCreateOpen ? "닫기" : "방 만들기"}
        </button>
      </header>

      {isCreateOpen ? (
        <section className="panel" style={{ padding: 20, display: "grid", gap: 14 }}>
          <h2 style={{ margin: 0 }}>방 만들기</h2>
          <input
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, MAX_ROOM_NAME_LENGTH))}
            placeholder="방 이름"
            style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--text)" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {GAME_MODES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: item === mode ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
                  background: item === mode ? "rgba(71,184,255,0.18)" : "transparent",
                  color: "var(--text)"
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
            비밀번호 방
          </label>
          {isPrivate ? (
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value.slice(0, MAX_ROOM_PASSWORD_LENGTH))}
              placeholder="비밀번호"
              style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--text)" }}
            />
          ) : null}
          <button
            type="button"
            onClick={handleCreateRoom}
            style={{ padding: "12px 16px", borderRadius: 14, border: 0, background: "var(--blue)", color: "#04131d", fontWeight: 700, cursor: "pointer" }}
          >
            생성하기
          </button>
        </section>
      ) : null}

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
                  {room.status === "waiting" ? "대기중" : "게임중"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: "var(--muted)", fontSize: 14 }}>
                  {room.mode} · {room.currentPlayers}/{room.maxPlayers} · {room.isPrivate ? "비밀번호방" : "공개방"} · 코드 {room.roomCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleJoinRoom(room)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 12,
                    border: 0,
                    background: room.status === "waiting" ? "var(--blue)" : "rgba(255,255,255,0.14)",
                    color: room.status === "waiting" ? "#04131d" : "var(--text)",
                    fontWeight: 700,
                    cursor: room.status === "waiting" ? "pointer" : "not-allowed"
                  }}
                >
                  {room.status === "waiting" ? "입장" : "입장 불가"}
                </button>
              </div>
            </article>
          ))}
        </div>
        <aside className="panel" style={{ padding: 20, display: "grid", gap: 14, alignContent: "start", alignSelf: "start" }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>방 코드 입장</h2>
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="코드 입력"
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
            코드로 입장
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
            새로고침
          </button>
          <p style={{ margin: 0, color: error ? "#ff9388" : "var(--muted)", lineHeight: 1.6 }}>
            {error || "게임중 방은 목록에 표시만 하고 입장은 막습니다."}
          </p>
        </aside>
      </section>
    </main>
  );
}
